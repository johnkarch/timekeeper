import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { addDays, formatDateLabel, payPeriodStart, shortDayLabel, todayISO } from "@/lib/dates";
import { fetchPayPeriodCalendar } from "@/lib/pay-period-calendar";
import { buildXlsx } from "@/lib/xlsx";
import { buildPdf } from "@/lib/pdf";

export const runtime = "nodejs";

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
  const rows = await fetchPayPeriodCalendar(periodStart, submittedOnly);

  const header = [
    "Employee",
    ...days.map((day) => {
      const { weekday, date } = shortDayLabel(day);
      return `${weekday} ${date}`;
    }),
    "Total",
  ];

  const dataRows = rows.map((row) => [
    row.employee_name,
    ...row.days.map((hours) => (hours > 0 ? String(hours) : "")),
    String(row.total),
  ]);

  const dayTotals = days.map((_, i) => rows.reduce((sum, row) => sum + row.days[i], 0));
  const grandTotal = dayTotals.reduce((a, b) => a + b, 0);
  dataRows.push(["Total", ...dayTotals.map((t) => (t > 0 ? String(t) : "")), String(grandTotal)]);

  const title = `Pay Period: ${formatDateLabel(periodStart)} – ${formatDateLabel(days[13])}`;
  const filename = `payroll-${periodStart}`;

  if (format === "pdf") {
    const buffer = await buildPdf(title, header, dataRows, [90, ...Array(14).fill(40)]);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      },
    });
  }

  const buffer = await buildXlsx("Payroll", header, dataRows);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
    },
  });
}
