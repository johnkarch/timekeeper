import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { addDays, formatDateLabel, payPeriodStart, shortDayLabel, todayISO } from "@/lib/dates";
import { fetchPayPeriodCalendar } from "@/lib/pay-period-calendar";
import { fetchEmployeeHoursBreakdown } from "@/lib/employee-hours";
import { buildXlsx } from "@/lib/xlsx";
import { buildPdf } from "@/lib/pdf";

export const runtime = "nodejs";

// Matches the app's own header bar (src/app/(app)/nav.tsx) — a desaturated
// teal, same hue and lightness as Tailwind's teal-500 with saturation cut
// roughly in half.
const HEADER_COLOR = "#3d8f86";

export async function GET(request: Request) {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (current.role !== "admin") redirect("/payroll");

  const { searchParams } = new URL(request.url);
  const periodStart = payPeriodStart(searchParams.get("period") || todayISO());
  const submittedOnly = searchParams.get("scope") !== "all";
  const formatParam = searchParams.get("format");
  const format = formatParam === "pdf" ? "pdf" : "xlsx";

  const days = Array.from({ length: 14 }, (_, i) => addDays(periodStart, i));
  const calendarRows = await fetchPayPeriodCalendar(periodStart, submittedOnly);

  const calendarHeader = [
    "Employee",
    ...days.map((day) => {
      const { weekday, date } = shortDayLabel(day);
      return `${weekday} ${date}`;
    }),
    "Total",
  ];

  const calendarDataRows = calendarRows.map((row) => [
    row.employee_name,
    ...row.days.map((hours) => (hours > 0 ? String(hours) : "")),
    String(row.total),
  ]);

  // Captured before the totals row is appended, so the alternating shading
  // only ever applies to actual employee rows, not the summary row below them.
  const employeeRowCount = calendarDataRows.length;

  const dayTotals = days.map((_, i) => calendarRows.reduce((sum, row) => sum + row.days[i], 0));
  const grandTotal = dayTotals.reduce((a, b) => a + b, 0);
  calendarDataRows.push([
    "Total",
    ...dayTotals.map((t) => (t > 0 ? String(t) : "")),
    String(grandTotal),
  ]);

  // Pay Period Totals — always reflects every logged hour regardless of the
  // submitted/all scope above, matching the on-screen tiles.
  const breakdown = await fetchEmployeeHoursBreakdown(periodStart);
  const totalsHeader = [
    "Employee",
    "Regular Hours",
    "Overtime Hours",
    "Weekend Hours",
    "Vacation/Holiday/PTO",
  ];
  const totalsRows = breakdown.map((e) => [
    e.employee_name,
    e.regular.toFixed(1),
    e.overtime.toFixed(1),
    e.weekend.toFixed(1),
    e.pto.toFixed(1),
  ]);

  const title = `Pay Period: ${formatDateLabel(periodStart)} – ${formatDateLabel(days[13])}`;
  const filename = `payroll-${periodStart}`;

  if (format === "pdf") {
    const buffer = await buildPdf(title, [
      {
        header: calendarHeader,
        rows: calendarDataRows,
        colWidths: [90, ...Array(14).fill(40)],
        options: { stripeCount: employeeRowCount, headerColor: HEADER_COLOR },
      },
      {
        heading: "Pay Period Totals",
        header: totalsHeader,
        rows: totalsRows,
        colWidths: [150, 120, 120, 120],
        options: { stripeCount: totalsRows.length, headerColor: HEADER_COLOR },
      },
    ]);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      },
    });
  }

  const buffer = await buildXlsx([
    {
      sheetName: "Payroll",
      header: calendarHeader,
      rows: calendarDataRows,
      options: { stripeCount: employeeRowCount, headerColor: HEADER_COLOR },
    },
    {
      sheetName: "Pay Period Totals",
      header: totalsHeader,
      rows: totalsRows,
      options: {
        stripeCount: totalsRows.length,
        headerColor: HEADER_COLOR,
        numberFormat: "0.0",
      },
    },
  ]);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
    },
  });
}
