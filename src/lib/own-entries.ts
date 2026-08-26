import { createClient } from "@/lib/supabase/server";
import type { TimeEntryListItem } from "@/lib/types";

interface EntryRow {
  id: string;
  entry_date: string;
  hours: number | string;
  notes: string | null;
  billed: boolean;
  jobs: { name: string } | null;
  work_type_id: string | null;
  work_types: { name: string } | null;
}

// Fetches only the given user's own entries within a date range — used by
// Week Overview's grid, which is always scoped to "my own hours," regardless
// of role.
export async function fetchOwnEntries(
  userId: string,
  start: string,
  end: string
): Promise<TimeEntryListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("time_entries")
    .select("id, entry_date, hours, notes, billed, jobs(name), work_type_id, work_types(name)")
    .eq("user_id", userId)
    .gte("entry_date", start)
    .lte("entry_date", end)
    .order("entry_date", { ascending: true });

  if (error) {
    console.error("fetchOwnEntries failed:", error);
    return [];
  }

  const rows = (data ?? []) as unknown as EntryRow[];
  return rows.map((row) => ({
    id: row.id,
    entry_date: row.entry_date,
    hours: Number(row.hours),
    notes: row.notes,
    billed: row.billed,
    job_name: row.jobs?.name ?? "",
    work_type_id: row.work_type_id,
    work_type_name: row.work_types?.name ?? null,
  }));
}
