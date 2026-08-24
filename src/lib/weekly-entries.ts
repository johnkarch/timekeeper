import { createClient } from "@/lib/supabase/server";
import type { Role, WeeklyEntry, EmployeeOption } from "@/lib/types";

interface WeeklyQueryRow {
  id: string;
  entry_date: string;
  hours: number | string;
  notes: string | null;
  billed: boolean;
  jobs: { name: string };
  profiles: { full_name: string | null; email: string | null };
}

export interface WeeklyFilters {
  monday: string;
  sunday: string;
  employeeId?: string;
  q?: string;
}

export async function fetchWeeklyEntries(role: Role, filters: WeeklyFilters): Promise<WeeklyEntry[]> {
  const supabase = await createClient();

  let query = supabase
    .from("time_entries")
    .select(
      "id, entry_date, hours, notes, billed, user_id, jobs!inner(name), profiles!inner(full_name, email)"
    )
    .gte("entry_date", filters.monday)
    .lte("entry_date", filters.sunday)
    .order("entry_date", { ascending: true });

  if (role === "admin" && filters.employeeId) {
    query = query.eq("user_id", filters.employeeId);
  }
  if (role === "admin" && filters.q) {
    query = query.filter("jobs.name", "ilike", `%${filters.q}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("fetchWeeklyEntries failed:", error);
    return [];
  }

  const rows = (data ?? []) as unknown as WeeklyQueryRow[];
  return rows.map((row) => ({
    id: row.id,
    entry_date: row.entry_date,
    hours: Number(row.hours),
    notes: row.notes,
    billed: row.billed,
    job_name: row.jobs.name,
    employee_name: row.profiles.full_name || row.profiles.email || "Unknown",
  }));
}

export async function fetchEmployeeOptions(): Promise<EmployeeOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .order("full_name", { ascending: true });

  if (error) {
    console.error("fetchEmployeeOptions failed:", error);
    return [];
  }

  return (data ?? []).map((p) => ({
    id: p.id,
    label: p.full_name || p.email || p.id,
  }));
}
