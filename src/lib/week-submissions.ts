import { createClient } from "@/lib/supabase/server";
import type { WeekSubmission } from "@/lib/types";

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

// Used by the Payroll page. No role parameter needed — RLS already scopes
// this to "your own rows, or everyone's if you're an admin," so the same
// query works for both.
export async function fetchSubmissions(): Promise<WeekSubmission[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("week_submissions")
    .select("id, user_id, week_start, submitted_at, profiles(full_name, email)")
    .order("week_start", { ascending: false })
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error("fetchSubmissions failed:", error);
    return [];
  }

  const rows = (data ?? []) as unknown as SubmissionRow[];
  return rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    week_start: row.week_start,
    submitted_at: row.submitted_at,
    employee_name: row.profiles?.full_name || row.profiles?.email || "Unknown",
  }));
}
