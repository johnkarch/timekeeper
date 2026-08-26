"use client";

import { useState } from "react";
import { updateBillRate, deleteBillRate } from "./actions";
import SubmitButton from "@/components/submit-button";

export interface BillRateDisplay {
  id: string;
  employee_name: string;
  work_type_name: string;
  job_name: string | null;
  rate: number;
}

export default function BillRateRow({
  billRate,
  showJobColumn,
}: {
  billRate: BillRateDisplay;
  showJobColumn: boolean;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <tr className="border-b border-gray-100">
      <td className="px-4 py-2 font-medium text-gray-900">{billRate.employee_name}</td>
      <td className="px-4 py-2">{billRate.work_type_name}</td>
      {showJobColumn && <td className="px-4 py-2">{billRate.job_name}</td>}
      <td className="px-4 py-2 text-right">
        {editing ? (
          <form
            action={updateBillRate.bind(null, billRate.id)}
            className="flex items-center justify-end gap-2"
          >
            <input
              name="rate"
              type="number"
              step="0.01"
              min="0"
              required
              autoFocus
              defaultValue={billRate.rate}
              className="w-24 rounded-md border border-gray-300 px-2 py-1 text-right text-sm"
            />
            <SubmitButton
              pendingLabel="Saving…"
              className="rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white hover:bg-gray-800"
            >
              Save
            </SubmitButton>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </form>
        ) : (
          `$${billRate.rate.toFixed(2)}`
        )}
      </td>
      <td className="px-4 py-2">
        {!editing && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Edit
            </button>
            <form
              action={deleteBillRate.bind(null, billRate.id)}
              onSubmit={(e) => {
                if (!confirm("Delete this rate?")) e.preventDefault();
              }}
            >
              <SubmitButton
                pendingLabel="Deleting…"
                className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                Delete
              </SubmitButton>
            </form>
          </div>
        )}
      </td>
    </tr>
  );
}
