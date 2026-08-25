"use client";

import { useState } from "react";
import SubmittedWeekRow from "./submitted-week-row";
import type { SubmittedWeekSummary } from "@/lib/types";

export default function SubmittedWeeksTable({
  weeks,
  isAdmin,
}: {
  weeks: SubmittedWeekSummary[];
  isAdmin: boolean;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const colCount = isAdmin ? 4 : 3;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 text-gray-500">
          <tr>
            <th className="px-3 py-2 font-medium"></th>
            <th className="px-4 py-2 font-medium">Week</th>
            {isAdmin && <th className="px-4 py-2 font-medium">Employee</th>}
            <th className="px-4 py-2 text-right font-medium">Hours</th>
          </tr>
        </thead>
        <tbody>
          {weeks.length === 0 ? (
            <tr>
              <td colSpan={colCount} className="px-4 py-6 text-center text-gray-500">
                No weeks submitted this month.
              </td>
            </tr>
          ) : (
            weeks.map((week) => (
              <SubmittedWeekRow
                key={week.id}
                week={week}
                isAdmin={isAdmin}
                isExpanded={expanded.has(week.id)}
                onToggleExpand={() => toggleExpand(week.id)}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
