import { createClient } from "@/lib/supabase/server";

export interface MonthlyEntry {
  id: string;
  entry_date: string;
  hours: number;
  notes: string | null;
  billed: boolean;
  job_name: string;
  employee_name: string;
  user_id: string;
}

interface MonthlyQueryRow {
  id: string;
  entry_date: string;
  hours: number | string;
  notes: string | null;
  billed: boolean;
  user_id: string;
  jobs: { name: string };
  profiles: { full_name: string | null; email: string | null };
}

export interface MonthlyFilters {
  start: string; // first day of month, inclusive
  end: string; // first day of next month, exclusive
  billed?: "billed" | "unbilled";
  q?: string;
  userIds?: string[];
  jobIds?: string[];
}

export async function fetchMonthlyEntries(filters: MonthlyFilters): Promise<MonthlyEntry[]> {
  const supabase = await createClient();

  let query = supabase
    .from("time_entries")
    .select(
      "id, entry_date, hours, notes, billed, user_id, jobs!inner(name), profiles!inner(full_name, email)"
    )
    .gte("entry_date", filters.start)
    .lt("entry_date", filters.end)
    .order("entry_date", { ascending: true });

  if (filters.billed === "billed") query = query.eq("billed", true);
  if (filters.billed === "unbilled") query = query.eq("billed", false);
  if (filters.q) {
    query = query.filter("jobs.name", "ilike", `%${filters.q}%`);
  }
  if (filters.userIds && filters.userIds.length > 0) {
    query = query.in("user_id", filters.userIds);
  }
  if (filters.jobIds && filters.jobIds.length > 0) {
    query = query.in("job_id", filters.jobIds);
  }

  const { data, error } = await query;
  if (error) {
    console.error("fetchMonthlyEntries failed:", error);
    return [];
  }

  const rows = (data ?? []) as unknown as MonthlyQueryRow[];
  return rows.map((row) => ({
    id: row.id,
    entry_date: row.entry_date,
    hours: Number(row.hours),
    notes: row.notes,
    billed: row.billed,
    job_name: row.jobs.name,
    employee_name: row.profiles.full_name || row.profiles.email || "Unknown",
    user_id: row.user_id,
  }));
}
