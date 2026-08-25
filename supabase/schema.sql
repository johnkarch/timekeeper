-- Timekeeper App: database schema
--
-- How to run this: open your Supabase project -> SQL Editor -> New query,
-- paste this whole file in, and click "Run". It's safe to run once on a
-- fresh project. If you need to re-run it after making edits, you'll likely
-- need to drop the tables first (see note at the bottom).

-- ============================================================================
-- 1. PROFILES (adds a role to each logged-in user)
-- ============================================================================
-- Supabase Auth already has a built-in `auth.users` table for login/passwords
-- that we don't touch directly. This `profiles` table is a companion table,
-- one row per user, where we store app-specific info: their role.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'employee' check (role in ('employee', 'admin')),
  full_name text,
  email text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Automatically create a profile row whenever someone signs up, defaulting
-- to the 'employee' role. This runs as a trigger on Supabase's own
-- auth.users table.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper function used by policies below: "is the current logged-in user an
-- admin?" security definer lets it read the profiles table even though the
-- calling user's own RLS policy might not otherwise allow it.
create function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Everyone can see their own profile row; admins can see everyone's.
create policy "profiles: read own or read all if admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

-- Only admins can change roles (promote someone to admin, etc). There is no
-- self-serve "become admin" button anywhere in the app on purpose.
create policy "profiles: only admins can update"
  on public.profiles for update
  using (public.is_admin());

-- RLS policies control *which rows* a role can see, but Postgres separately
-- requires the role to have basic table-level privileges before RLS even
-- gets evaluated. Without this grant, every query fails with "permission
-- denied for table profiles" regardless of how permissive the policies are.
grant select, update on public.profiles to authenticated;

-- ============================================================================
-- 2. JOBS
-- ============================================================================

-- Job number and job name are intentionally ONE field, not two — this
-- matches how jobs are already named on the company's cloud server, e.g.
-- "100001 KAIN - Modern Escape" or "122000 - 2010 Packer Drive - Green Bay".
-- The leading 6 digits are still required and still guaranteed unique (see
-- the expression index below); everything after them is free text.
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (name ~ '^\d{6}(\D|$)'),
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enforces uniqueness on just the leading 6-digit number, regardless of
-- what free text follows it, without needing a separate column for it.
create unique index jobs_number_unique_idx on public.jobs (substring(name from '^\d{6}'));

alter table public.jobs enable row level security;

-- Any logged-in user can look up jobs (needed for the "type to search"
-- feature on the Log Time form).
create policy "jobs: any logged-in user can read"
  on public.jobs for select
  to authenticated
  using (true);

-- Only admins can create, edit, or deactivate jobs.
create policy "jobs: only admins can insert"
  on public.jobs for insert
  to authenticated
  with check (public.is_admin());

create policy "jobs: only admins can update"
  on public.jobs for update
  to authenticated
  using (public.is_admin());

-- A job with time entries against it can't actually be deleted (the
-- foreign key on time_entries.job_id blocks it) — this is only reachable
-- for a job created by mistake with nothing logged against it yet.
-- Deactivate is the intended way to retire a job with real history.
create policy "jobs: only admins can delete"
  on public.jobs for delete
  to authenticated
  using (public.is_admin());

-- See the note above profiles' grant statement — same reasoning applies here.
grant select, insert, update, delete on public.jobs to authenticated;

-- ============================================================================
-- 3. TIME ENTRIES
-- ============================================================================

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  job_id uuid not null references public.jobs (id),
  entry_date date not null,
  hours numeric(5, 2) not null check (hours > 0 and hours <= 24),
  notes text,
  billed boolean not null default false,
  billed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index time_entries_user_date_idx on public.time_entries (user_id, entry_date);
create index time_entries_job_idx on public.time_entries (job_id);
create index time_entries_billed_idx on public.time_entries (billed);

alter table public.time_entries enable row level security;

-- Employees see only their own entries; admins see everyone's.
create policy "time_entries: read own or read all if admin"
  on public.time_entries for select
  using (user_id = auth.uid() or public.is_admin());

-- Employees can only ever create entries for themselves.
create policy "time_entries: insert own"
  on public.time_entries for insert
  to authenticated
  with check (user_id = auth.uid());

-- Employees can edit/delete their own entries, but only while unbilled —
-- once an entry has been marked billed, editing hours would silently
-- disagree with an invoice that's already gone out. Admins can edit/delete
-- anything (including flipping the billed status itself).
create policy "time_entries: update own unbilled or admin"
  on public.time_entries for update
  using ((user_id = auth.uid() and billed = false) or public.is_admin())
  with check ((user_id = auth.uid() and billed = false) or public.is_admin());

create policy "time_entries: delete own unbilled or admin"
  on public.time_entries for delete
  using ((user_id = auth.uid() and billed = false) or public.is_admin());

-- See the note above profiles' grant statement — same reasoning applies here.
grant select, insert, update, delete on public.time_entries to authenticated;

-- ============================================================================
-- 4. Keep updated_at fresh
-- ============================================================================

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

create trigger time_entries_set_updated_at
  before update on public.time_entries
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 5. WEEK SUBMISSIONS (locks a week's entries pending payroll review)
-- ============================================================================
-- Presence of a row = that user's week is locked. There's deliberately no
-- "unsubmit" self-service for employees — an admin deleting the row (via the
-- Payroll page) is what undoes it, same spirit as the billed lock above.

create table public.week_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  week_start date not null, -- Monday of the submitted week
  submitted_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create index week_submissions_week_idx on public.week_submissions (week_start);

alter table public.week_submissions enable row level security;

-- Employees see only their own submitted weeks; admins see everyone's.
create policy "week_submissions: read own or read all if admin"
  on public.week_submissions for select
  using (user_id = auth.uid() or public.is_admin());

-- Anyone can submit (lock) their own week.
create policy "week_submissions: insert own"
  on public.week_submissions for insert
  to authenticated
  with check (user_id = auth.uid());

-- Only admins can undo a submission — no update policy exists because a
-- submission is either present (locked) or gone (unlocked); there's nothing
-- in between to edit.
create policy "week_submissions: only admins can delete"
  on public.week_submissions for delete
  to authenticated
  using (public.is_admin());

grant select, insert, delete on public.week_submissions to authenticated;

-- Helper used by the time_entries policies below: "has this user's week
-- (the one containing p_date) been submitted?" security definer so it can
-- read week_submissions regardless of the calling user's own RLS grant,
-- same reasoning as is_admin() above.
create function public.week_is_submitted(p_user_id uuid, p_date date)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.week_submissions
    where user_id = p_user_id
      and week_start = date_trunc('week', p_date)::date
  );
$$;

-- Re-layer the time_entries write policies to also block a submitted week.
-- The submitted-week lock applies to the row's OWNER regardless of role —
-- an admin's own submitted week locks exactly like an employee's; admins
-- only bypass it when acting on someone ELSE's row (existing cross-user
-- admin powers, unchanged). The billed-lock's admin bypass on an admin's
-- own rows is untouched — that's a separate, pre-existing exception.
-- `drop policy if exists` makes this safe to run both on a fresh project and
-- as an update against an existing one.
drop policy if exists "time_entries: insert own" on public.time_entries;
create policy "time_entries: insert own"
  on public.time_entries for insert
  to authenticated
  with check (
    (user_id = auth.uid() and not public.week_is_submitted(user_id, entry_date))
    or (public.is_admin() and user_id <> auth.uid())
  );

drop policy if exists "time_entries: update own unbilled or admin" on public.time_entries;
create policy "time_entries: update own unbilled or admin"
  on public.time_entries for update
  using (
    (
      user_id = auth.uid()
      and not public.week_is_submitted(user_id, entry_date)
      and (billed = false or public.is_admin())
    )
    or (public.is_admin() and user_id <> auth.uid())
  )
  with check (
    (
      user_id = auth.uid()
      and not public.week_is_submitted(user_id, entry_date)
      and (billed = false or public.is_admin())
    )
    or (public.is_admin() and user_id <> auth.uid())
  );

drop policy if exists "time_entries: delete own unbilled or admin" on public.time_entries;
create policy "time_entries: delete own unbilled or admin"
  on public.time_entries for delete
  using (
    (
      user_id = auth.uid()
      and not public.week_is_submitted(user_id, entry_date)
      and (billed = false or public.is_admin())
    )
    or (public.is_admin() and user_id <> auth.uid())
  );

-- ============================================================================
-- 6. First admin
-- ============================================================================
-- New users default to 'employee' and only an existing admin can promote
-- someone else — but that means the very first admin has to be set by hand.
-- After you've signed up your own account through the app once, come back
-- here, uncomment the line below, fill in your email, and run just that line.
--
-- update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'you@example.com');

-- ============================================================================
-- Re-running this file
-- ============================================================================
-- This script only works on a clean project. If you need to change the
-- schema later, either write a new migration file with ALTER TABLE
-- statements, or drop everything first with:
--
-- drop table if exists public.time_entries, public.jobs, public.profiles, public.week_submissions cascade;
-- drop function if exists public.handle_new_user, public.is_admin, public.set_updated_at, public.week_is_submitted cascade;
