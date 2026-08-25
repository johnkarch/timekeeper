import { createClient } from "@/lib/supabase/server";
import { fetchOwnEntries } from "@/lib/own-entries";
import { addDays, addMonths, firstOfMonth } from "@/lib/dates";
import type { SubmittedWeekSummary } from "@/lib/types";

// Single-week lookup for Week Overview, which only ever needs to know
// whether the week it's currently showing is locked.
export async function fetchOwnSubmission(
  userId: string,
  weekStart: string
): Promise<{ submittedAt: string } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("week_submissions")
    .select("submitted_at")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (error) {
    console.error("fetchOwnSubmission failed:", error);
    return null;
  }

  return data ? { submittedAt: data.submitted_at } : null;
}

interface SubmissionRow {
  id: string;
  user_id: string;
  week_start: string;
  submitted_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
}

// Powers the Payroll page's "submitted weeks" module. No role parameter
// needed — RLS already scopes the week_submissions rows returned to "your
// own, or everyone's if you're an admin," so the same query works for both.
export async function fetchSubmittedWeeksForMonth(month: string): Promise<SubmittedWeekSummary[]> {
  const start = firstOfMonth(month);
  const end = firstOfMonth(addMonths(month, 1));

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("week_submissions")
    .select("id, user_id, week_start, submitted_at, profiles(full_name, email)")
    .gte("week_start", start)
    .lt("week_start", end)
    .order("week_start", { ascending: false })
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error("fetchSubmittedWeeksForMonth failed:", error);
    return [];
  }

  const rows = (data ?? []) as unknown as SubmissionRow[];

  return Promise.all(
    rows.map(async (row) => {
      const entries = await fetchOwnEntries(row.user_id, row.week_start, addDays(row.week_start, 6));

      const byJob = new Map<string, number>();
      for (const entry of entries) {
        byJob.set(entry.job_name, (byJob.get(entry.job_name) ?? 0) + entry.hours);
      }
      const job_breakdown = Array.from(byJob.entries())
        .map(([job_name, hours]) => ({ job_name, hours }))
        .sort((a, b) => a.job_name.localeCompare(b.job_name));

      return {
        id: row.id,
        user_id: row.user_id,
        employee_name: row.profiles?.full_name || row.profiles?.email || "Unknown",
        week_start: row.week_start,
        submitted_at: row.submitted_at,
        total_hours: entries.reduce((sum, e) => sum + e.hours, 0),
        job_breakdown,
      };
    })
  );
}
