import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { addMonths, currentMonth, firstOfMonth, formatMonthLabel } from "@/lib/dates";
import { fetchMonthlyEntries } from "@/lib/monthly-entries";
import { toCsv } from "@/lib/csv";
import { buildXlsx } from "@/lib/xlsx";
import { buildPdf } from "@/lib/pdf";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (current.role !== "admin") redirect("/weekly");

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || currentMonth();
  const billedParam = searchParams.get("billed");
  const billed = billedParam === "billed" || billedParam === "unbilled" ? billedParam : undefined;
  const q = searchParams.get("q") ?? undefined;
  const formatParam = searchParams.get("format");
  const format = formatParam === "xlsx" || formatParam === "pdf" ? formatParam : "csv";

  const start = firstOfMonth(month);
  const end = firstOfMonth(addMonths(month, 1));

  const entries = await fetchMonthlyEntries({ start, end, billed, q });

  const header = ["Date", "Employee", "Job", "Hours", "Notes", "Billed"];
  const rows = entries.map((e) => [
    e.entry_date,
    e.employee_name,
    e.job_name,
    String(e.hours),
    e.notes ?? "",
    e.billed ? "Yes" : "No",
  ]);

  const filename = `monthly-${month}`;

  if (format === "xlsx") {
    const buffer = await buildXlsx([{ sheetName: "Monthly", header, rows }]);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      },
    });
  }

  if (format === "pdf") {
    // Billed moves ahead of Notes here (unlike the CSV/Excel column order
    // above) so Notes stays last and can take up whatever width is left on
    // the page rather than being squeezed by a fixed column after it.
    const pdfHeader = ["Date", "Employee", "Job", "Hours", "Billed", "Notes"];
    const pdfRows = entries.map((e) => [
      e.entry_date,
      e.employee_name,
      e.job_name,
      String(e.hours),
      e.billed ? "Yes" : "No",
      e.notes ?? "",
    ]);
    const buffer = await buildPdf(formatMonthLabel(month), [
      {
        header: pdfHeader,
        rows: pdfRows,
        colWidths: [
          65, // Date
          90, // Employee
          140, // Job
          42, // Hours
          45, // Billed
        ],
      },
    ]);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      },
    });
  }

  const csv = toCsv([header, ...rows]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
    },
  });
}
