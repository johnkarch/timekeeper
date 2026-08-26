import Link from "next/link";
import { addDays } from "@/lib/dates";
import type { EmployeeStatistics } from "@/lib/types";

function modeLink(mode: "period" | "ytd", periodStart: string) {
  return mode === "ytd" ? "/business?mode=ytd" : `/business?mode=period&period=${periodStart}`;
}

export default function EmployeeStatisticsPanel({
  stats,
  mode,
  periodStart,
  rangeLabel,
}: {
  stats: EmployeeStatistics[];
  mode: "period" | "ytd";
  periodStart: string;
  rangeLabel: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">Employee Statistics</h2>
          <p className="text-xs text-gray-400">{rangeLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          {mode === "period" && (
            <>
              <Link
                href={modeLink("period", addDays(periodStart, -14))}
                className="rounded-md border border-blue-600 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50"
              >
                ← Prev period
              </Link>
              <Link
                href={modeLink("period", addDays(periodStart, 14))}
                className="rounded-md border border-blue-600 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50"
              >
                Next period →
              </Link>
            </>
          )}
          <Link
            href={modeLink(mode === "ytd" ? "period" : "ytd", periodStart)}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              mode === "ytd"
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            Year to date
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-[#3d8f86] text-white">
            <tr>
              <th className="px-4 py-2 font-medium">Employee</th>
              <th className="px-4 py-2 text-right font-medium">Regular</th>
              <th className="px-4 py-2 text-right font-medium">Overtime</th>
              <th className="px-4 py-2 text-right font-medium">Weekend</th>
              <th className="px-4 py-2 text-right font-medium">PTO</th>
              <th className="px-4 py-2 text-right font-medium">Billed</th>
              <th className="px-4 py-2 text-right font-medium">Unbilled</th>
              <th className="px-4 py-2 text-right font-medium">PTO Balance</th>
            </tr>
          </thead>
          <tbody>
            {stats.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                  No employees yet.
                </td>
              </tr>
            ) : (
              stats.map((row) => (
                <tr key={row.user_id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2 font-medium text-gray-900">{row.employee_name}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{row.regular.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{row.overtime.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{row.weekend.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{row.pto.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {row.billed_hours.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {row.unbilled_hours.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {row.pto_balance.toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
