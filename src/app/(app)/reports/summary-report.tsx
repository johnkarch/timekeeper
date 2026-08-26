import { resolveDetailFilters } from "@/lib/report-filters";
import { fetchMonthlyEntries } from "@/lib/monthly-entries";
import { summarizeByJob } from "@/lib/job-summary";
import ReportFiltersForm from "./report-filters-form";
import type { CurrentUser } from "@/lib/auth";
import type { Employee, Job } from "@/lib/types";

export default async function SummaryReport({
  searchParams,
  current,
  employees,
  jobs,
}: {
  searchParams: Record<string, string | string[] | undefined>;
  current: CurrentUser;
  employees: Employee[];
  jobs: Job[];
}) {
  const isAdmin = current.role === "admin";
  const filters = resolveDetailFilters(searchParams, current);
  const entries = await fetchMonthlyEntries(filters);
  const summary = summarizeByJob(entries);

  const exportParams: Record<string, string | string[]> = {
    type: "summary",
    start: filters.start,
    end: filters.end,
  };
  if (filters.billed) exportParams.billed = filters.billed;
  if (isAdmin && filters.userIds) exportParams.employee_id = filters.userIds;
  if (filters.jobIds) exportParams.job_id = filters.jobIds;

  return (
    <div className="space-y-4">
      <ReportFiltersForm
        type="summary"
        searchParams={searchParams}
        filters={filters}
        isAdmin={isAdmin}
        employees={employees}
        jobs={jobs}
        exportParams={exportParams}
      />

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-[#3d8f86] text-white">
            <tr>
              <th className="px-4 py-2 font-medium">Job</th>
              <th className="px-4 py-2 text-right font-medium">Hours</th>
            </tr>
          </thead>
          <tbody>
            {summary.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-gray-500">
                  No entries match.
                </td>
              </tr>
            ) : (
              summary.map((row) => (
                <tr key={row.job_name} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2 font-medium text-gray-900">{row.job_name}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{row.hours}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
