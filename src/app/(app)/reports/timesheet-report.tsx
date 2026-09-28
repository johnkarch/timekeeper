import Link from "next/link";
import { addDays, formatDateLabel } from "@/lib/dates";
import { resolveTimesheetFilters } from "@/lib/report-filters";
import { fetchMonthlyEntries } from "@/lib/monthly-entries";
import { buildWeeklyTimesheetGrid, DAY_NAMES } from "@/lib/weekly-timesheet";
import { employeeLabel } from "@/lib/employee-label";
import ExportMenu from "@/components/export-menu";
import type { CurrentUser } from "@/lib/auth";
import type { Employee } from "@/lib/types";

const EXPORT_FORMATS = [
  { format: "xlsx", label: "Excel (.xlsx)" },
  { format: "pdf", label: "PDF" },
];

function weekLink(monday: string, employeeId?: string) {
  const params = new URLSearchParams({ type: "timesheet", week: monday });
  if (employeeId) params.set("employee_id", employeeId);
  return `/reports?${params.toString()}`;
}

// A single employee's week as a printable Day x Job grid — the "Teal
// Brand" mockup the user picked, now wired to real data. Available to
// everyone (mirrors Detail/Summary's own everyone-sees-their-own-hours
// behavior), with an extra employee picker for admins.
export default async function TimesheetReport({
  searchParams,
  current,
  employees,
}: {
  searchParams: Record<string, string | string[] | undefined>;
  current: CurrentUser;
  employees: Employee[];
}) {
  const isAdmin = current.role === "admin";
  const { monday, userId } = resolveTimesheetFilters(searchParams, current);
  const sunday = addDays(monday, 6);

  const entries = await fetchMonthlyEntries({
    start: monday,
    end: addDays(monday, 7),
    userIds: [userId],
  });
  const grid = buildWeeklyTimesheetGrid(entries, monday);

  const viewedEmployee =
    userId === current.user.id
      ? { full_name: current.fullName, email: current.user.email ?? null }
      : employees.find((e) => e.id === userId);
  const employeeName = viewedEmployee?.full_name || viewedEmployee?.email || "Unknown";

  const exportParams: Record<string, string | string[]> = { type: "timesheet", week: monday };
  if (isAdmin) exportParams.employee_id = userId;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          {isAdmin && (
            <form method="GET" className="flex items-end gap-2">
              <input type="hidden" name="type" value="timesheet" />
              <input type="hidden" name="week" value={monday} />
              <div>
                <label htmlFor="employee_id" className="mb-1 block text-sm font-medium text-gray-700">
                  Employee
                </label>
                <select
                  id="employee_id"
                  name="employee_id"
                  defaultValue={userId}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {employeeLabel(e)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                View
              </button>
            </form>
          )}

          <div className="flex items-center gap-2">
            <Link
              href={weekLink(addDays(monday, -7), isAdmin ? userId : undefined)}
              className="rounded-md border border-blue-600 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50"
            >
              ← Prev week
            </Link>
            <Link
              href={weekLink(addDays(monday, 7), isAdmin ? userId : undefined)}
              className="rounded-md border border-blue-600 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50"
            >
              Next week →
            </Link>
          </div>

          <form method="GET" className="flex items-end gap-2">
            <input type="hidden" name="type" value="timesheet" />
            {isAdmin && <input type="hidden" name="employee_id" value={userId} />}
            <div>
              <label htmlFor="week" className="mb-1 block text-sm font-medium text-gray-700">
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
        </div>

        <ExportMenu basePath="/api/export/reports" params={exportParams} formats={EXPORT_FORMATS} />
      </div>

      <div>
        <h2 className="text-base font-bold text-gray-900">{employeeName}</h2>
        <p className="text-xs text-gray-400">
          {formatDateLabel(monday)} – {formatDateLabel(sunday)}
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-[#3d8f86] text-white">
            <tr>
              <th className="px-4 py-2 font-medium">Day</th>
              {grid.jobs.map((job) => (
                <th key={job} className="px-4 py-2 text-right font-medium">
                  {job}
                </th>
              ))}
              <th className="border-l border-gray-200 px-4 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {grid.jobs.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-gray-400">
                  No entries this week.
                </td>
              </tr>
            ) : (
              DAY_NAMES.map((day, i) => (
                <tr key={day} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{day}</td>
                  {grid.jobs.map((job, j) => (
                    <td key={job} className="px-4 py-2 text-right tabular-nums">
                      {grid.hours[i][j] > 0 ? grid.hours[i][j] : <span className="text-gray-300">—</span>}
                    </td>
                  ))}
                  <td className="border-l border-gray-200 px-4 py-2.5 text-right font-medium tabular-nums text-gray-900">
                    {grid.dayTotals[i]}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {grid.jobs.length > 0 && (
            <tfoot className="border-t border-gray-200 bg-gray-50 font-medium text-gray-900">
              <tr>
                <td className="px-4 py-2.5">Total</td>
                {grid.jobs.map((job, j) => (
                  <td key={job} className="px-4 py-2.5 text-right tabular-nums">
                    {grid.jobTotals[j]}
                  </td>
                ))}
                <td className="border-l border-gray-200 px-4 py-2.5 text-right tabular-nums">
                  {grid.grandTotal}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
