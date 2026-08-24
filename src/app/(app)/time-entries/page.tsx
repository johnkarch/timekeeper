import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NewEntryForm from "./new-entry-form";
import EntryRow from "./entry-row";
import type { TimeEntryListItem } from "@/lib/types";

interface TimeEntryRow {
  id: string;
  entry_date: string;
  hours: number;
  notes: string | null;
  billed: boolean;
  jobs: { name: string } | null;
}

export default async function TimeEntriesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("time_entries")
    .select("id, entry_date, hours, notes, billed, jobs(name)")
    .eq("user_id", user.id)
    .order("entry_date", { ascending: false })
    .limit(20);

  const rows = (data ?? []) as unknown as TimeEntryRow[];
  const entries: TimeEntryListItem[] = rows.map((row) => ({
    id: row.id,
    entry_date: row.entry_date,
    hours: row.hours,
    notes: row.notes,
    billed: row.billed,
    job_name: row.jobs?.name ?? "",
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Log time</h1>
        <p className="text-sm text-gray-500">Enter your hours for a job.</p>
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Saved.</p>}

      <NewEntryForm />

      <div>
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Recent entries</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-gray-500">No entries yet.</p>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white px-4">
            {entries.map((entry) => (
              <EntryRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
