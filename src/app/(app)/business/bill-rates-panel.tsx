"use client";

import { Fragment, useState } from "react";
import { addBillRate } from "./actions";
import { resolveBillRate } from "@/lib/resolve-bill-rate";
import { employeeLabel } from "@/lib/employee-label";
import SubmitButton from "@/components/submit-button";
import { todayISO, formatDateLabel } from "@/lib/dates";
import type { BillRate, Employee } from "@/lib/types";

export default function BillRatesPanel({
  employees,
  billRates,
}: {
  employees: Employee[];
  billRates: BillRate[];
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const today = todayISO();

  function toggleExpand(userId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  return (
    <div className="space-y-2">
      <h2 className="text-base font-bold text-gray-900">Bill Rates</h2>
      <p className="text-xs text-gray-400">
        Effective-dated history — a rate change never applies to work logged before its effective
        date.
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
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Effective Date</label>
          <input
            name="effective_date"
            type="date"
            required
            defaultValue={today}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
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
              <th className="px-3 py-2 font-medium"></th>
              <th className="px-4 py-2 font-medium">Employee</th>
              <th className="px-4 py-2 text-right font-medium">Current Rate</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => {
              const history = billRates
                .filter((r) => r.user_id === employee.id)
                .sort((a, b) => b.effective_date.localeCompare(a.effective_date));
              const current = resolveBillRate(billRates, employee.id, today);
              const isExpanded = expanded.has(employee.id);

              return (
                <Fragment key={employee.id}>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <td className="px-3 py-2">
                      {history.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(employee.id)}
                          className="text-gray-400 hover:text-gray-600"
                          aria-label={`Toggle history for ${employeeLabel(employee)}`}
                        >
                          {isExpanded ? "▾" : "▸"}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2 font-medium text-gray-900">
                      {employeeLabel(employee)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {current !== null ? `$${current.toFixed(2)}` : "—"}
                    </td>
                  </tr>
                  {isExpanded &&
                    history.map((rate) => (
                      <tr key={rate.id} className="border-b border-gray-50 text-sm text-gray-600">
                        <td></td>
                        <td className="px-4 py-1.5">{formatDateLabel(rate.effective_date)}</td>
                        <td className="px-4 py-1.5 text-right">${rate.rate.toFixed(2)}</td>
                      </tr>
                    ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
