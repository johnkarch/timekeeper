import { addBillRate } from "./actions";
import BillRateRow, { type BillRateDisplay } from "./bill-rate-row";
import { employeeLabel } from "@/lib/employee-label";
import SubmitButton from "@/components/submit-button";
import type { BillRate, Employee } from "@/lib/types";

function toDisplay(rates: BillRate[], employees: Employee[]): BillRateDisplay[] {
  const employeeById = new Map(employees.map((e) => [e.id, e]));

  return rates.map((rate) => ({
    id: rate.id,
    employee_name: employeeById.get(rate.user_id)
      ? employeeLabel(employeeById.get(rate.user_id)!)
      : "Unknown",
    rate: rate.rate,
  }));
}

export default function BillRatesSection({
  billRates,
  employees,
}: {
  billRates: BillRate[];
  employees: Employee[];
}) {
  const rates = toDisplay(billRates, employees);

  return (
    <div className="space-y-2">
      <h2 className="text-base font-bold text-gray-900">Bill Rates</h2>
      <p className="text-xs text-gray-400">The rate an employee bills at, regardless of job.</p>
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
              <th className="px-4 py-2 text-right font-medium">Rate</th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rates.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                  No rates set yet.
                </td>
              </tr>
            ) : (
              rates.map((rate) => <BillRateRow key={rate.id} billRate={rate} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
