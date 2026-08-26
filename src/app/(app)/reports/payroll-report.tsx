import Link from "next/link";
import { addDays, formatDateLabel, shortDayLabel, todayISO } from "@/lib/dates";
import { fetchPayPeriodCalendar } from "@/lib/pay-period-calendar";
import { fetchEmployeeHoursBreakdown } from "@/lib/employee-hours";
import ExportMenu from "@/components/export-menu";

const EXPORT_FORMATS = [
  { format: "xlsx", label: "Excel (.xlsx)" },
  { format: "pdf", label: "PDF" },
];

function periodLink(periodStart: string, scope: "all" | "submitted") {
  return `/reports?type=payroll&period=${periodStart}&scope=${scope}`;
}

// Relocated from the old Payroll page's Pay Period Calendar + Pay Period
// Totals modules — same rigid 14-day-period navigation (payroll doesn't
// make sense outside real pay-period boundaries), just living under
// Reports now. Admin-only, gated by the page above this component.
export default async function PayrollReport({
  periodStart,
  scope,
}: {
  periodStart: string;
  scope: "all" | "submitted";
}) {
  const days = Array.from({ length: 14 }, (_, i) => addDays(periodStart, i));
  const periodEnd = days[13];
  const todayStr = todayISO();
  const submittedOnly = scope === "submitted";

  const [rows, breakdown] = await Promise.all([
    fetchPayPeriodCalendar(periodStart, submittedOnly),
    fetchEmployeeHoursBreakdown(periodStart),
  ]);

  const dayTotals = days.map((_, i) => rows.reduce((sum, row) => sum + row.days[i], 0));
  const grandTotal = dayTotals.reduce((a, b) => a + b, 0);

  function dayColClass(i: number, base: string) {
    const classes = [base];
    if (days[i] === todayStr) classes.push("bg-blue-50");
    else if (i % 7 === 5 || i % 7 === 6) classes.push("bg-gray-50/70");
    if (i === 7) classes.push("border-l-2 border-l-gray-300");
    return classes.join(" ");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <h2 className="text-base font-bold text-gray-900">Pay Period Calendar</h2>
              <p className="text-xs text-gray-400">
                {formatDateLabel(periodStart)} – {formatDateLabel(periodEnd)}
              </p>
            </div>
            <Link
              href={periodLink(addDays(periodStart, -14), scope)}
              className="rounded-md border border-blue-600 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50"
            >
              ← Prev period
            </Link>
            <Link
              href={periodLink(addDays(periodStart, 14), scope)}
              className="rounded-md border border-blue-600 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50"
            >
              Next period →
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <ExportMenu
              basePath="/api/export/reports"
              params={{ type: "payroll", period: periodStart, scope }}
              formats={EXPORT_FORMATS}
            />
            <Link
              href={periodLink(periodStart, submittedOnly ? "all" : "submitted")}
              className="inline-flex items-center gap-2"
            >
              <span
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  submittedOnly ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    submittedOnly ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </span>
              <span className="text-sm whitespace-nowrap text-gray-700">
                {submittedOnly ? "Submitted weeks only" : "Everything logged"}
              </span>
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-[#3d8f86] text-white">
              <tr>
                <th className="px-3 py-2 font-medium whitespace-nowrap">Employee</th>
                {days.map((day, i) => {
                  const { weekday, date } = shortDayLabel(day);
                  return (
                    <th
                      key={day}
                      className={dayColClass(
                        i,
                        `px-1.5 py-2 text-right text-xs font-medium whitespace-nowrap ${
                          day === todayStr ? "text-blue-700" : ""
                        }`
                      )}
                    >
                      <div className="leading-tight">
                        <div className="font-normal text-gray-400">{weekday}</div>
                        <div>{date}</div>
                      </div>
                    </th>
                  );
                })}
                <th className="border-l border-gray-200 px-3 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={16} className="px-4 py-8 text-center text-gray-400">
                    {submittedOnly ? "No submitted weeks in this period." : "No entries this period."}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.user_id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60"
                  >
                    <td className="px-3 py-2.5 font-medium whitespace-nowrap text-gray-900">
                      {row.employee_name}
                    </td>
                    {row.days.map((hours, i) => (
                      <td
                        key={i}
                        className={dayColClass(i, "px-1.5 py-2 text-right text-xs tabular-nums")}
                      >
                        {hours > 0 ? hours : <span className="text-gray-300">—</span>}
                      </td>
                    ))}
                    <td className="border-l border-gray-200 px-3 py-2.5 text-right font-medium tabular-nums text-gray-900">
                      {row.total}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot className="border-t border-gray-200 bg-gray-50 font-medium text-gray-900">
                <tr>
                  <td className="px-3 py-2.5">Total</td>
                  {dayTotals.map((t, i) => (
                    <td
                      key={i}
                      className={dayColClass(i, "px-1.5 py-2.5 text-right text-xs tabular-nums")}
                    >
                      {t > 0 ? t : "—"}
                    </td>
                  ))}
                  <td className="border-l border-gray-200 px-3 py-2.5 text-right tabular-nums">
                    {grandTotal}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-base font-bold text-gray-900">Pay Period Totals</h2>

        {breakdown.length === 0 ? (
          <p className="text-sm text-gray-500">No hours logged this period.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {breakdown.map((e) => (
              <div key={e.user_id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="font-bold text-gray-900">{e.employee_name}</h3>
                <div className="mt-2 space-y-1 text-sm text-gray-700">
                  <p>Regular hours: {e.regular.toFixed(2)}</p>
                  <p>Overtime hours: {e.overtime.toFixed(2)}</p>
                  <p>Weekend hours: {e.weekend.toFixed(2)}</p>
                  <p>Vacation/Holiday/PTO: {e.pto.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
