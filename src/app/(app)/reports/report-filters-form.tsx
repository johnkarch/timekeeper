import Link from "next/link";
import ChecklistField from "./checklist-field";
import ExportMenu from "@/components/export-menu";
import { addDays, addMonths, currentMonth, firstOfMonth, todayISO } from "@/lib/dates";
import { employeeLabel } from "@/lib/employee-label";
import type { Employee, Job } from "@/lib/types";
import type { ResolvedReportFilters } from "@/lib/report-filters";

// Builds a preset link that carries forward every current filter (employee/
// job selections included) except the date range, which it overrides —
// clicking "This Month"/"Year to Date" shouldn't reset who/what you'd
// already narrowed down to.
function presetHref(
  type: "detail" | "summary",
  searchParams: Record<string, string | string[] | undefined>,
  start: string,
  endInclusive: string
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "start" || key === "end" || key === "type") continue;
    if (value === undefined) continue;
    if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
    else params.set(key, value);
  }
  params.set("type", type);
  params.set("start", start);
  params.set("end", endInclusive);
  return `/reports?${params.toString()}`;
}

export default function ReportFiltersForm({
  type,
  searchParams,
  filters,
  isAdmin,
  employees,
  jobs,
  exportParams,
}: {
  type: "detail" | "summary";
  searchParams: Record<string, string | string[] | undefined>;
  filters: ResolvedReportFilters;
  isAdmin: boolean;
  employees: Employee[];
  jobs: Job[];
  exportParams: Record<string, string | string[]>;
}) {
  const month = currentMonth();
  const thisMonthStart = firstOfMonth(month);
  const thisMonthEndInclusive = addDays(firstOfMonth(addMonths(month, 1)), -1);
  const ytdStart = `${todayISO().slice(0, 4)}-01-01`;
  const ytdEndInclusive = todayISO();

  const inclusiveEnd = addDays(filters.end, -1);
  const selectedEmployeeIds = isAdmin && filters.userIds ? new Set(filters.userIds) : null;
  const selectedJobIds = filters.jobIds ? new Set(filters.jobIds) : null;

  const presetClass =
    "rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50";

  return (
    <form method="GET" className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      <input type="hidden" name="type" value={type} />
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex gap-2">
          <Link href={presetHref(type, searchParams, thisMonthStart, thisMonthEndInclusive)} className={presetClass}>
            This Month
          </Link>
          <Link href={presetHref(type, searchParams, ytdStart, ytdEndInclusive)} className={presetClass}>
            Year to Date
          </Link>
        </div>
        <div>
          <label htmlFor="start" className="mb-1 block text-sm font-medium text-gray-700">
            Start
          </label>
          <input
            id="start"
            name="start"
            type="date"
            defaultValue={filters.start}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="end" className="mb-1 block text-sm font-medium text-gray-700">
            End
          </label>
          <input
            id="end"
            name="end"
            type="date"
            defaultValue={inclusiveEnd}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="billed" className="mb-1 block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            id="billed"
            name="billed"
            defaultValue={filters.billed ?? ""}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="unbilled">Unbilled</option>
            <option value="billed">Billed</option>
          </select>
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        {isAdmin && (
          <ChecklistField
            name="employee_id"
            heading="Employees"
            options={employees.map((e) => ({ id: e.id, label: employeeLabel(e) }))}
            selectedIds={selectedEmployeeIds}
          />
        )}
        <ChecklistField
          name="job_id"
          heading="Jobs"
          options={jobs.map((j) => ({ id: j.id, label: j.name }))}
          selectedIds={selectedJobIds}
        />
      </div>
      <div className="flex items-center justify-between">
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Apply
        </button>
        <ExportMenu basePath="/api/export/reports" params={exportParams} />
      </div>
    </form>
  );
}
