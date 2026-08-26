import { resolveDetailFilters } from "@/lib/report-filters";
import { fetchMonthlyEntries } from "@/lib/monthly-entries";
import ReportFiltersForm from "./report-filters-form";
import type { CurrentUser } from "@/lib/auth";
import type { Employee, Job } from "@/lib/types";

export default async function DetailReport({
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

  const exportParams: Record<string, string | string[]> = {
    type: "detail",
    start: filters.start,
    end: filters.end,
  };
  if (filters.billed) exportParams.billed = filters.billed;
  if (isAdmin && filters.userIds) exportParams.employee_id = filters.userIds;
  if (filters.jobIds) exportParams.job_id = filters.jobIds;

  return (
    <div className="space-y-4">
      <ReportFiltersForm
        type="detail"
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
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Employee</th>
              <th className="px-4 py-2 font-medium">Job</th>
              <th className="px-4 py-2 font-medium">Hours</th>
              <th className="px-4 py-2 font-medium">Notes</th>
              <th className="px-4 py-2 font-medium">Billed</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                  No entries match.
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2">{e.entry_date}</td>
                  <td className="px-4 py-2">{e.employee_name}</td>
                  <td className="px-4 py-2">{e.job_name}</td>
                  <td className="px-4 py-2">{e.hours}</td>
                  <td className="px-4 py-2 text-gray-500">{e.notes ?? ""}</td>
                  <td className="px-4 py-2">{e.billed ? "Yes" : "No"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
