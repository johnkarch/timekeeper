-- Timekeeper App: database schema
--
-- How to run this on a BRAND NEW Supabase project: open SQL Editor -> New
-- query, paste this whole file in, and click "Run". It's only safe to paste
-- the WHOLE file once, on a fresh project — sections 1-6 use plain
-- `create table` (not `create table if not exists`), so re-pasting them
-- against a project that already has these tables fails with
-- "relation already exists".
--
-- To apply a LATER change to an existing project (i.e. every time after the
-- first): only run the NEW numbered section that was just added to the
-- bottom of this file, not the whole thing. Sections from 7 onward are
-- written to be safe to re-run on their own (they use `if not exists` /
-- `drop ... if exists` guards), but the file as a whole is not.

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
-- 7. WORK TYPES (labor categories, e.g. "Design", "Field Labor", "PM")
-- ============================================================================
-- A small admin-managed list, independent of Jobs. Every time entry going
-- forward is tagged with one of these (see time_entries.work_type_id below).

create table if not exists public.work_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists work_types_name_unique_idx
  on public.work_types (lower(name));

alter table public.work_types enable row level security;

-- Any logged-in user can read the list (needed to populate the dropdown on
-- the Log Time form).
drop policy if exists "work_types: any logged-in user can read" on public.work_types;
create policy "work_types: any logged-in user can read"
  on public.work_types for select
  to authenticated
  using (true);

-- Only admins can create, edit, or deactivate work types.
drop policy if exists "work_types: only admins can insert" on public.work_types;
create policy "work_types: only admins can insert"
  on public.work_types for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "work_types: only admins can update" on public.work_types;
create policy "work_types: only admins can update"
  on public.work_types for update
  to authenticated
  using (public.is_admin());

-- A work type with time entries against it can't actually be deleted (the
-- foreign key on time_entries.work_type_id blocks it) — same pattern as
-- jobs. Deactivate is the intended way to retire one with real history.
drop policy if exists "work_types: only admins can delete" on public.work_types;
create policy "work_types: only admins can delete"
  on public.work_types for delete
  to authenticated
  using (public.is_admin());

grant select, insert, update, delete on public.work_types to authenticated;

drop trigger if exists work_types_set_updated_at on public.work_types;
create trigger work_types_set_updated_at
  before update on public.work_types
  for each row execute function public.set_updated_at();

-- Nullable at the database level (existing historical rows have none), but
-- the app enforces it as required for anything logged going forward — an
-- admin must create at least one active work type before employees can log
-- time (see the Log Time form's empty-state message).
alter table public.time_entries
  add column if not exists work_type_id uuid references public.work_types (id);

create index if not exists time_entries_work_type_idx
  on public.time_entries (work_type_id);

-- ============================================================================
-- 8. BILL RATES (admin-set, keyed by employee + work type, optional job override)
-- ============================================================================
-- Two flavors of row, distinguished by whether job_id is null:
--   - job_id IS NULL     -> the employee's default rate for that work type.
--   - job_id IS NOT NULL -> an override that applies only on that one job.
-- Resolution order (done in application code, not SQL): job-specific row
-- first, falling back to the default row, per (employee, work type).

create table if not exists public.bill_rates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  work_type_id uuid not null references public.work_types (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete cascade,
  rate numeric(8, 2) not null check (rate >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Only one default rate per (employee, work type)...
create unique index if not exists bill_rates_default_unique_idx
  on public.bill_rates (user_id, work_type_id)
  where job_id is null;

-- ...and only one override per (employee, work type, job).
create unique index if not exists bill_rates_job_override_unique_idx
  on public.bill_rates (user_id, work_type_id, job_id)
  where job_id is not null;

alter table public.bill_rates enable row level security;

-- Admin-only in both directions — this is pay-rate data, not something any
-- employee should be able to read about themselves or anyone else.
drop policy if exists "bill_rates: only admins can read" on public.bill_rates;
create policy "bill_rates: only admins can read"
  on public.bill_rates for select
  to authenticated
  using (public.is_admin());

drop policy if exists "bill_rates: only admins can insert" on public.bill_rates;
create policy "bill_rates: only admins can insert"
  on public.bill_rates for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "bill_rates: only admins can update" on public.bill_rates;
create policy "bill_rates: only admins can update"
  on public.bill_rates for update
  to authenticated
  using (public.is_admin());

drop policy if exists "bill_rates: only admins can delete" on public.bill_rates;
create policy "bill_rates: only admins can delete"
  on public.bill_rates for delete
  to authenticated
  using (public.is_admin());

grant select, insert, update, delete on public.bill_rates to authenticated;

drop trigger if exists bill_rates_set_updated_at on public.bill_rates;
create trigger bill_rates_set_updated_at
  before update on public.bill_rates
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 9. WAGE RATES (effective-dated history per employee, append-only)
-- ============================================================================
-- A new row is inserted whenever an employee's wage changes; nothing is ever
-- edited or deleted, so past rates stay intact for historical reporting. The
-- "current" rate as of a given date is the row with the latest
-- effective_date <= that date.

create table if not exists public.wage_rates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  hourly_rate numeric(8, 2) not null check (hourly_rate >= 0),
  effective_date date not null,
  created_at timestamptz not null default now()
);

-- Only one wage-rate row per employee per effective date (re-entering the
-- same date is a mistake, not a legitimate second rate on that day).
create unique index if not exists wage_rates_user_date_unique_idx
  on public.wage_rates (user_id, effective_date);

create index if not exists wage_rates_user_idx
  on public.wage_rates (user_id, effective_date desc);

alter table public.wage_rates enable row level security;

-- Admin-only, same reasoning as bill_rates.
drop policy if exists "wage_rates: only admins can read" on public.wage_rates;
create policy "wage_rates: only admins can read"
  on public.wage_rates for select
  to authenticated
  using (public.is_admin());

drop policy if exists "wage_rates: only admins can insert" on public.wage_rates;
create policy "wage_rates: only admins can insert"
  on public.wage_rates for insert
  to authenticated
  with check (public.is_admin());

-- No update or delete policy on purpose — this table is append-only. If a
-- rate was entered wrong, the fix is to insert a correcting row with the
-- right effective_date, not to edit history.

grant select, insert on public.wage_rates to authenticated;

-- ============================================================================
-- 10. PTO ADJUSTMENTS (append-only ledger; balance = sum(adjustments) - used)
-- ============================================================================
-- Each row is a grant or correction to an employee's PTO balance (positive
-- or negative hours) with a required reason. "PTO hours used" is NOT stored
-- here — it's derived on the fly from time_entries using the same
-- PTO_JOB_PATTERN the Payroll page already uses (see src/lib/pto.ts).

create table if not exists public.pto_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  hours numeric(6, 2) not null check (hours <> 0),
  reason text not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists pto_adjustments_user_idx on public.pto_adjustments (user_id);

alter table public.pto_adjustments enable row level security;

-- Admin-only, same reasoning as bill_rates/wage_rates.
drop policy if exists "pto_adjustments: only admins can read" on public.pto_adjustments;
create policy "pto_adjustments: only admins can read"
  on public.pto_adjustments for select
  to authenticated
  using (public.is_admin());

drop policy if exists "pto_adjustments: only admins can insert" on public.pto_adjustments;
create policy "pto_adjustments: only admins can insert"
  on public.pto_adjustments for insert
  to authenticated
  with check (public.is_admin());

-- No update or delete policy on purpose — append-only ledger, same spirit
-- as wage_rates. A mistaken grant is corrected with an offsetting negative
-- row, not by editing/deleting the original.

grant select, insert on public.pto_adjustments to authenticated;

-- ============================================================================
-- 11. Simplify bill rates to per-employee only (retire Work Types)
-- ============================================================================
-- Work Type and job-specific overrides turned out to be more complexity than
-- the business needed — bill rate now depends only on which employee logged
-- the hours. A rate can no longer vary by work type, so existing
-- per-employee-per-work-type rows can't be collapsed into one automatically;
-- this truncates bill_rates once (only the first time this section runs,
-- detected by whether the old work_type_id column is still there) so you can
-- re-enter each employee's single rate afterward. Re-running this whole file
-- later — once the table's already in its new shape — leaves your re-entered
-- rates alone.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'bill_rates' and column_name = 'work_type_id'
  ) then
    truncate table public.bill_rates;
  end if;
end $$;

alter table public.bill_rates drop column if exists work_type_id;
alter table public.bill_rates drop column if exists job_id;

drop index if exists public.bill_rates_default_unique_idx;
drop index if exists public.bill_rates_job_override_unique_idx;
create unique index if not exists bill_rates_user_id_unique_idx
  on public.bill_rates (user_id);

-- The Work Type tag on time entries is no longer used.
alter table public.time_entries drop column if exists work_type_id;

-- Work Types themselves are no longer used anywhere.
drop table if exists public.work_types cascade;

-- ============================================================================
-- Re-running this file
-- ============================================================================
-- This script only works on a clean project. If you need to change the
-- schema later, either write a new migration file with ALTER TABLE
-- statements, or drop everything first with:
--
-- drop table if exists public.time_entries, public.jobs, public.profiles, public.week_submissions, public.bill_rates, public.wage_rates, public.pto_adjustments cascade;
-- drop function if exists public.handle_new_user, public.is_admin, public.set_updated_at, public.week_is_submitted cascade;
