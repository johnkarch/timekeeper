"use client";

import { addDays, formatDateLabel } from "@/lib/dates";
import UnlockToggle from "./unlock-toggle";
import type { SubmittedWeekSummary } from "@/lib/types";

export default function SubmittedWeekRow({
  week,
  isAdmin,
  isExpanded,
  onToggleExpand,
}: {
  week: SubmittedWeekSummary;
  isAdmin: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const colCount = isAdmin ? 4 : 3;

  return (
    <>
      <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
        <td className="px-3 py-2">
          <button
            type="button"
            onClick={onToggleExpand}
            className="text-gray-400 hover:text-gray-600"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? "▾" : "▸"}
          </button>
        </td>
        <td className="px-4 py-2 whitespace-nowrap">
          <button type="button" onClick={onToggleExpand} className="text-left hover:underline">
            {formatDateLabel(week.week_start)} – {formatDateLabel(addDays(week.week_start, 6))}
          </button>
        </td>
        {isAdmin && <td className="px-4 py-2">{week.employee_name}</td>}
        <td className="px-4 py-2 text-right font-medium tabular-nums">{week.total_hours}</td>
      </tr>

      {isExpanded && (
        <tr className="border-b border-gray-100 bg-gray-50/60 last:border-0">
          <td></td>
          <td colSpan={colCount - 1} className="px-4 py-3">
            <div className="space-y-3">
              <table className="w-full max-w-sm text-left text-sm">
                <thead className="text-gray-500">
                  <tr>
                    <th className="py-1 font-medium">Job</th>
                    <th className="py-1 text-right font-medium">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {week.job_breakdown.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-1 text-gray-400">
                        No entries.
                      </td>
                    </tr>
                  ) : (
                    week.job_breakdown.map((j) => (
                      <tr key={j.job_name} className="border-t border-gray-200">
                        <td className="py-1">{j.job_name}</td>
                        <td className="py-1 text-right tabular-nums">{j.hours}</td>
                      </tr>
                    ))
                  )}
                  <tr className="border-t border-gray-300 font-medium text-gray-900">
                    <td className="py-1">Total</td>
                    <td className="py-1 text-right tabular-nums">{week.total_hours}</td>
                  </tr>
                </tbody>
              </table>

              {isAdmin && <UnlockToggle submissionId={week.id} />}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
