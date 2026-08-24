"use client";

import { useState } from "react";
import type { MonthlyEntry } from "@/lib/monthly-entries";

export default function EntrySelection({
  entries,
  month,
  billedFilter,
  q,
  action,
}: {
  entries: MonthlyEntry[];
  month: string;
  billedFilter: string;
  q: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = entries.length > 0 && selected.size === entries.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(entries.map((e) => e.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="month" value={month} />
      <input type="hidden" name="billedFilter" value={billedFilter} />
      <input type="hidden" name="q" value={q} />

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 text-gray-500">
            <tr>
              <th className="px-4 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all"
                />
              </th>
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
                <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                  No entries match.
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      name="entryIds"
                      value={e.id}
                      checked={selected.has(e.id)}
                      onChange={() => toggleOne(e.id)}
                      aria-label={`Select entry from ${e.entry_date}`}
                    />
                  </td>
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

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">{selected.size} selected</span>
        <button
          type="submit"
          name="intent"
          value="bill"
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          Mark billed
        </button>
        <button
          type="submit"
          name="intent"
          value="unbill"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          Mark unbilled
        </button>
      </div>
    </form>
  );
}
