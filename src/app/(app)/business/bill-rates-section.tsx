import { addBillRate } from "./actions";
import BillRateRow, { type BillRateDisplay } from "./bill-rate-row";
import { employeeLabel } from "@/lib/employee-label";
import SubmitButton from "@/components/submit-button";
import type { BillRate, Employee, Job, WorkType } from "@/lib/types";

function toDisplay(
  rates: BillRate[],
  employees: Employee[],
  workTypes: WorkType[],
  jobs: Job[]
): BillRateDisplay[] {
  const employeeById = new Map(employees.map((e) => [e.id, e]));
  const workTypeById = new Map(workTypes.map((w) => [w.id, w]));
  const jobById = new Map(jobs.map((j) => [j.id, j]));

  return rates.map((rate) => ({
    id: rate.id,
    employee_name: employeeById.get(rate.user_id)
      ? employeeLabel(employeeById.get(rate.user_id)!)
      : "Unknown",
    work_type_name: workTypeById.get(rate.work_type_id)?.name ?? "Unknown",
    job_name: rate.job_id ? (jobById.get(rate.job_id)?.name ?? "Unknown") : null,
    rate: rate.rate,
  }));
}

export default function BillRatesSection({
  billRates,
  employees,
  workTypes,
  jobs,
}: {
  billRates: BillRate[];
  employees: Employee[];
  workTypes: WorkType[];
  jobs: Job[];
}) {
  const defaults = toDisplay(
    billRates.filter((r) => r.job_id === null),
    employees,
    workTypes,
    jobs
  );
  const overrides = toDisplay(
    billRates.filter((r) => r.job_id !== null),
    employees,
    workTypes,
    jobs
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-base font-bold text-gray-900">Default Bill Rates</h2>
        <p className="text-xs text-gray-400">
          The rate an employee bills at for a given work type, unless overridden for a specific
          job below.
        </p>
        <form
          action={addBillRate}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Employee</label>
            <select
              name="user_id"
              required
              defaultValue=""
              className="w-56 rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="" disabled>
                Choose…
              </option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {employeeLabel(e)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Work Type</label>
            <select
              name="work_type_id"
              required
              defaultValue=""
              className="w-48 rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="" disabled>
                Choose…
              </option>
              {workTypes.map((wt) => (
                <option key={wt.id} value={wt.id}>
                  {wt.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Rate ($/hr)</label>
            <input
              name="rate"
              type="number"
              step="0.01"
              min="0"
              required
              className="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <SubmitButton
            pendingLabel="Adding…"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add rate
          </SubmitButton>
        </form>

        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Employee</th>
                <th className="px-4 py-2 font-medium">Work Type</th>
                <th className="px-4 py-2 text-right font-medium">Rate</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {defaults.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                    No default rates set yet.
                  </td>
                </tr>
              ) : (
                defaults.map((rate) => (
                  <BillRateRow key={rate.id} billRate={rate} showJobColumn={false} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-base font-bold text-gray-900">Job-Specific Overrides</h2>
        <p className="text-xs text-gray-400">
          Overrides the default rate above, but only when hours are logged against this specific
          job.
        </p>
        <form
          action={addBillRate}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Employee</label>
            <select
              name="user_id"
              required
              defaultValue=""
              className="w-56 rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="" disabled>
                Choose…
              </option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {employeeLabel(e)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Work Type</label>
            <select
              name="work_type_id"
              required
              defaultValue=""
              className="w-48 rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="" disabled>
                Choose…
              </option>
              {workTypes.map((wt) => (
                <option key={wt.id} value={wt.id}>
                  {wt.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Job</label>
            <select
              name="job_id"
              required
              defaultValue=""
              className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="" disabled>
                Choose…
              </option>
              {jobs
                .filter((j) => j.is_active)
                .map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Rate ($/hr)</label>
            <input
              name="rate"
              type="number"
              step="0.01"
              min="0"
              required
              className="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <SubmitButton
            pendingLabel="Adding…"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add override
          </SubmitButton>
        </form>

        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Employee</th>
                <th className="px-4 py-2 font-medium">Work Type</th>
                <th className="px-4 py-2 font-medium">Job</th>
                <th className="px-4 py-2 text-right font-medium">Rate</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {overrides.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    No job overrides set yet.
                  </td>
                </tr>
              ) : (
                overrides.map((rate) => (
                  <BillRateRow key={rate.id} billRate={rate} showJobColumn={true} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
