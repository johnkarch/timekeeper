import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addDays, mondayOf, todayISO, formatDateLabel } from "@/lib/dates";
import NewEntryForm from "./new-entry-form";
import EntryRow from "./entry-row";
import type { TimeEntryListItem } from "@/lib/types";

interface TimeEntryRow {
  id: string;
  entry_date: string;
  hours: number | string;
  notes: string | null;
  billed: boolean;
  jobs: { name: string } | null;
}

interface JobWeekRow {
  job_name: string;
  hours: number[]; // Monday..Sunday
  total: number;
}

function weekLink(monday: string) {
  return `/time-entries?week=${monday}`;
}

export default async function TimeEntriesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; week?: string }>;
}) {
  const { error, success, week } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const monday = mondayOf(week || todayISO());
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const sunday = days[6];

  const { data } = await supabase
    .from("time_entries")
    .select("id, entry_date, hours, notes, billed, jobs(name)")
    .eq("user_id", user.id)
    .gte("entry_date", monday)
    .lte("entry_date", sunday)
    .order("entry_date", { ascending: true });

  const rows = (data ?? []) as unknown as TimeEntryRow[];
  const entries: TimeEntryListItem[] = rows.map((row) => ({
    id: row.id,
    entry_date: row.entry_date,
    hours: Number(row.hours),
    notes: row.notes,
    billed: row.billed,
    job_name: row.jobs?.name ?? "",
  }));

  const jobHours = new Map<string, number[]>();
  for (const entry of entries) {
    const dayIndex = days.indexOf(entry.entry_date);
    if (dayIndex === -1) continue;
    const hours = jobHours.get(entry.job_name) ?? [0, 0, 0, 0, 0, 0, 0];
    hours[dayIndex] += entry.hours;
    jobHours.set(entry.job_name, hours);
  }

  const gridRows: JobWeekRow[] = Array.from(jobHours.entries())
    .map(([job_name, hours]) => ({
      job_name,
      hours,
      total: hours.reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => a.job_name.localeCompare(b.job_name));

  const dayTotals = days.map((_, i) => gridRows.reduce((sum, row) => sum + row.hours[i], 0));
  const grandTotal = dayTotals.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Log time</h1>
        <p className="text-sm text-gray-500">Enter your hours for a job.</p>
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Saved.</p>}

      <NewEntryForm weekParam={monday} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">Your week</p>
          <h2 className="text-xl font-semibold text-gray-900">
            {formatDateLabel(monday)} – {formatDateLabel(sunday)}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={weekLink(addDays(monday, -7))}
            className="rounded-md border border-blue-600 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50"
          >
            ← Prev week
          </Link>
          <Link
            href={weekLink(addDays(monday, 7))}
            className="rounded-md border border-blue-600 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50"
          >
            Next week →
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Job</th>
              {days.map((day) => (
                <th key={day} className="px-4 py-2 text-right font-medium whitespace-nowrap">
                  {formatDateLabel(day)}
                </th>
              ))}
              <th className="px-4 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {gridRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-gray-500">
                  No entries this week.
                </td>
              </tr>
            ) : (
              gridRows.map((row) => (
                <tr key={row.job_name} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2">{row.job_name}</td>
                  {row.hours.map((h, i) => (
                    <td key={i} className="px-4 py-2 text-right text-gray-700">
                      {h > 0 ? h : "—"}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right font-medium text-gray-900">{row.total}</td>
                </tr>
              ))
            )}
          </tbody>
          {gridRows.length > 0 && (
            <tfoot className="border-t border-gray-200 font-medium text-gray-900">
              <tr>
                <td className="px-4 py-2">Total</td>
                {dayTotals.map((t, i) => (
                  <td key={i} className="px-4 py-2 text-right">
                    {t > 0 ? t : "—"}
                  </td>
                ))}
                <td className="px-4 py-2 text-right">{grandTotal}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Entries this week</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-gray-500">No entries yet.</p>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white px-4">
            {entries.map((entry) => (
              <EntryRow key={entry.id} entry={entry} weekParam={monday} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
