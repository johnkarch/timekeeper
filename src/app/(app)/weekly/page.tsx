import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { addDays, mondayOf, todayISO, formatDateLabel } from "@/lib/dates";
import { fetchWeeklyEntries, fetchEmployeeOptions } from "@/lib/weekly-entries";
import JobSearchField from "@/app/(app)/job-search-field";

function weekLink(monday: string, employee?: string, q?: string) {
  const params = new URLSearchParams({ week: monday });
  if (employee) params.set("employee", employee);
  if (q) params.set("q", q);
  return `/weekly?${params.toString()}`;
}

export default async function WeeklyPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; employee?: string; q?: string }>;
}) {
  const { week, employee, q } = await searchParams;

  const current = await getCurrentUser();
  if (!current) redirect("/login");
  const { role } = current;

  const monday = mondayOf(week || todayISO());
  const sunday = addDays(monday, 6);
  const prevMonday = addDays(monday, -7);
  const nextMonday = addDays(monday, 7);

  const adminEmployee = role === "admin" ? employee : undefined;
  const adminQ = role === "admin" ? q : undefined;

  const entries = await fetchWeeklyEntries(role, {
    monday,
    sunday,
    employeeId: adminEmployee,
    q: adminQ,
  });
  const employees = role === "admin" ? await fetchEmployeeOptions() : [];

  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);

  const byJob = new Map<string, { job_name: string; hours: number }>();
  for (const e of entries) {
    const existing = byJob.get(e.job_name);
    if (existing) {
      existing.hours += e.hours;
    } else {
      byJob.set(e.job_name, { job_name: e.job_name, hours: e.hours });
    }
  }
  const jobSubtotals = Array.from(byJob.values()).sort((a, b) => a.job_name.localeCompare(b.job_name));

  const exportParams = new URLSearchParams({ week: monday });
  if (adminEmployee) exportParams.set("employee", adminEmployee);
  if (adminQ) exportParams.set("q", adminQ);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">Weekly view</p>
          <h1 className="text-2xl font-semibold text-gray-900">
            {formatDateLabel(monday)} – {formatDateLabel(sunday)}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={weekLink(prevMonday, adminEmployee, adminQ)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            ← Prev week
          </Link>
          <Link
            href={weekLink(nextMonday, adminEmployee, adminQ)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            Next week →
          </Link>
        </div>
      </div>

      <form
        method="GET"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4"
      >
        <div>
          <label htmlFor="week" className="mb-1 block text-sm font-medium text-gray-700">
            Jump to a date in the week
          </label>
          <input
            id="week"
            name="week"
            type="date"
            defaultValue={monday}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        {role === "admin" && (
          <>
            <div>
              <label htmlFor="employee" className="mb-1 block text-sm font-medium text-gray-700">
                Employee
              </label>
              <select
                id="employee"
                name="employee"
                defaultValue={adminEmployee ?? ""}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">All employees</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.label}
                  </option>
                ))}
              </select>
            </div>
            <JobSearchField defaultValue={adminQ ?? ""} />
          </>
        )}
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Apply
        </button>
        <a
          href={`/api/export/weekly?${exportParams.toString()}`}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          Export CSV
        </a>
      </form>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Date</th>
              {role === "admin" && <th className="px-4 py-2 font-medium">Employee</th>}
              <th className="px-4 py-2 font-medium">Job</th>
              <th className="px-4 py-2 font-medium">Hours</th>
              <th className="px-4 py-2 font-medium">Notes</th>
              <th className="px-4 py-2 font-medium">Billed</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={role === "admin" ? 6 : 5} className="px-4 py-6 text-center text-gray-500">
                  No entries this week.
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2">{e.entry_date}</td>
                  {role === "admin" && <td className="px-4 py-2">{e.employee_name}</td>}
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-900">Subtotal by job</h2>
          {jobSubtotals.length === 0 ? (
            <p className="text-sm text-gray-500">No entries this week.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {jobSubtotals.map((j) => (
                <li key={j.job_name} className="flex justify-between">
                  <span>{j.job_name}</span>
                  <span className="font-medium">{j.hours}h</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-900">Total for week</h2>
          <p className="text-2xl font-semibold text-gray-900">{totalHours}h</p>
        </div>
      </div>
    </div>
  );
}
