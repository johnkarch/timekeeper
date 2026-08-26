"use client";

import { Fragment, useState } from "react";
import { addPtoAdjustment } from "./actions";
import { employeeLabel } from "@/lib/employee-label";
import SubmitButton from "@/components/submit-button";
import { formatDateLabel } from "@/lib/dates";
import type { Employee, PtoAdjustment } from "@/lib/types";

export default function PtoPanel({
  employees,
  adjustments,
  balances,
}: {
  employees: Employee[];
  adjustments: PtoAdjustment[];
  balances: Map<string, number>;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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
      <h2 className="text-base font-bold text-gray-900">PTO</h2>
      <p className="text-xs text-gray-400">
        Balance = every hour granted here, minus PTO hours actually logged. A mistaken grant is
        corrected with an offsetting adjustment, not by editing history.
      </p>

      <form
        action={addPtoAdjustment}
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
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Hours (negative to correct)
          </label>
          <input
            name="hours"
            type="number"
            step="0.25"
            required
            className="w-40 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="min-w-[240px] flex-1">
          <label className="mb-1 block text-sm font-medium text-gray-700">Reason</label>
          <input
            name="reason"
            type="text"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <SubmitButton
          pendingLabel="Adding…"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add adjustment
        </SubmitButton>
      </form>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-[#3d8f86] text-white">
            <tr>
              <th className="px-3 py-2 font-medium"></th>
              <th className="px-4 py-2 font-medium">Employee</th>
              <th className="px-4 py-2 text-right font-medium">Balance</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => {
              const history = adjustments
                .filter((a) => a.user_id === employee.id)
                .sort((a, b) => b.created_at.localeCompare(a.created_at));
              const balance = balances.get(employee.id) ?? 0;
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
                          aria-label={`Toggle PTO history for ${employeeLabel(employee)}`}
                        >
                          {isExpanded ? "▾" : "▸"}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2 font-medium text-gray-900">
                      {employeeLabel(employee)}
                    </td>
                    <td className="px-4 py-2 text-right">{balance.toFixed(2)} hrs</td>
                  </tr>
                  {isExpanded &&
                    history.map((adjustment) => (
                      <tr key={adjustment.id} className="border-b border-gray-50 text-sm text-gray-600">
                        <td></td>
                        <td className="px-4 py-1.5">
                          {formatDateLabel(adjustment.created_at.slice(0, 10))} —{" "}
                          {adjustment.reason}
                        </td>
                        <td className="px-4 py-1.5 text-right">
                          {adjustment.hours > 0 ? "+" : ""}
                          {adjustment.hours.toFixed(2)}
                        </td>
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
