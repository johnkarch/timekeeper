import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { addDays, mondayOf, todayISO, formatDateLabel } from "@/lib/dates";
import { fetchOwnEntries } from "@/lib/own-entries";
import NewEntryForm from "./new-entry-form";
import EntryTile from "./entry-tile";
import DismissibleBanner from "@/components/dismissible-banner";
import ExportMenu from "@/components/export-menu";
import type { TimeEntryListItem } from "@/lib/types";

interface JobWeekRow {
  job_name: string;
  cells: TimeEntryListItem[][]; // Monday..Sunday, each day's list of entries for this job
  total: number;
}

function emptyWeek(): TimeEntryListItem[][] {
  return Array.from({ length: 7 }, () => []);
}

function weekLink(monday: string) {
  return `/weekly?week=${monday}`;
}

export default async function WeeklyPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; error?: string; success?: string }>;
}) {
  const { week, error, success } = await searchParams;

  const current = await getCurrentUser();
  if (!current) redirect("/login");

  const monday = mondayOf(week || todayISO());
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const sunday = days[6];

  const entries = await fetchOwnEntries(current.user.id, monday, sunday);

  const jobCells = new Map<string, TimeEntryListItem[][]>();
  for (const entry of entries) {
    const dayIndex = days.indexOf(entry.entry_date);
    if (dayIndex === -1) continue;
    const cells = jobCells.get(entry.job_name) ?? emptyWeek();
    cells[dayIndex].push(entry);
    jobCells.set(entry.job_name, cells);
  }

  const gridRows: JobWeekRow[] = Array.from(jobCells.entries())
    .map(([job_name, cells]) => ({
      job_name,
      cells,
      total: cells.reduce((sum, day) => sum + day.reduce((s, e) => s + e.hours, 0), 0),
    }))
    .sort((a, b) => a.job_name.localeCompare(b.job_name));

  const dayTotals = days.map((_, i) =>
    gridRows.reduce((sum, row) => sum + row.cells[i].reduce((s, e) => s + e.hours, 0), 0)
  );
  const grandTotal = dayTotals.reduce((a, b) => a + b, 0);

  const exportParams = { week: monday };
  const todayStr = todayISO();

  function dayColClass(i: number, base: string) {
    if (days[i] === todayStr) return `${base} bg-blue-50`;
    if (i === 5 || i === 6) return `${base} bg-gray-50/70`;
    return base;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">Week Overview</p>
          <h1 className="text-2xl font-semibold text-gray-900">
            {formatDateLabel(monday)} – {formatDateLabel(sunday)}
          </h1>
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

      {error && <DismissibleBanner message={error} variant="error" />}
      {success && <DismissibleBanner message="Saved." variant="success" />}

      <div className="flex flex-wrap items-start gap-3">
        <NewEntryForm weekParam={monday} />

        <form method="GET" className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="week" className="text-sm font-medium whitespace-nowrap text-gray-700">
              Jump to the week of:
            </label>
            <input
              id="week"
              name="week"
              type="date"
              defaultValue={monday}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Apply
          </button>
        </form>

        <ExportMenu basePath="/api/export/weekly" params={exportParams} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Job</th>
              {days.map((day, i) => (
                <th
                  key={day}
                  className={dayColClass(
                    i,
                    `px-4 py-3 text-right font-medium whitespace-nowrap ${
                      days[i] === todayStr ? "text-blue-700" : ""
                    }`
                  )}
                >
                  {formatDateLabel(day)}
                </th>
              ))}
              <th className="border-l border-gray-200 px-4 py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {gridRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  No entries this week.
                </td>
              </tr>
            ) : (
              gridRows.map((row) => (
                <tr
                  key={row.job_name}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60"
                >
                  <td className="px-4 py-2.5 font-medium text-gray-900">{row.job_name}</td>
                  {row.cells.map((dayEntries, i) => (
                    <td key={i} className={dayColClass(i, "px-2 py-2 text-right")}>
                      {dayEntries.length > 0 ? (
                        <div className="flex flex-col items-end gap-1">
                          {dayEntries.map((entry) => (
                            <EntryTile
                              key={entry.id}
                              entry={entry}
                              weekParam={monday}
                              canEdit={current.role === "admin" || !entry.billed}
                              highlight={days[i] === todayStr}
                            />
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  ))}
                  <td className="border-l border-gray-200 px-4 py-2.5 text-right font-medium tabular-nums text-gray-900">
                    {row.total}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {gridRows.length > 0 && (
            <tfoot className="border-t border-gray-200 bg-gray-50 font-medium text-gray-900">
              <tr>
                <td className="px-4 py-2.5">Total</td>
                {dayTotals.map((t, i) => (
                  <td
                    key={i}
                    className={dayColClass(
                      i,
                      `px-4 py-2.5 text-right tabular-nums ${
                        days[i] === todayStr ? "text-blue-900" : ""
                      }`
                    )}
                  >
                    {t > 0 ? t : "—"}
                  </td>
                ))}
                <td className="border-l border-gray-200 px-4 py-2.5 text-right tabular-nums">
                  {grandTotal}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
