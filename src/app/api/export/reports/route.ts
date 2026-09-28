import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { addDays, formatDateLabel, payPeriodStart, shortDayLabel, todayISO } from "@/lib/dates";
import { resolveDetailFilters, resolveTimesheetFilters } from "@/lib/report-filters";
import { fetchMonthlyEntries } from "@/lib/monthly-entries";
import { summarizeByJob } from "@/lib/job-summary";
import { buildWeeklyTimesheetGrid, DAY_NAMES } from "@/lib/weekly-timesheet";
import { buildWeeklyTimesheetPdf } from "@/lib/timesheet-pdf";
import { fetchEmployeeById } from "@/lib/employees";
import { fetchPayPeriodCalendar } from "@/lib/pay-period-calendar";
import { fetchEmployeeHoursBreakdown } from "@/lib/employee-hours";
import { toCsv } from "@/lib/csv";
import { buildXlsx } from "@/lib/xlsx";
import { buildPdf } from "@/lib/pdf";

export const runtime = "nodejs";

// Matches the app's own header bar (src/app/(app)/nav.tsx) — a desaturated
// teal, same hue and lightness as Tailwind's teal-500 with saturation cut
// roughly in half.
const HEADER_COLOR = "#3d8f86";

function paramsToRecord(searchParams: URLSearchParams): Record<string, string | string[]> {
  const record: Record<string, string | string[]> = {};
  for (const key of new Set(searchParams.keys())) {
    const values = searchParams.getAll(key);
    record[key] = values.length > 1 ? values : values[0];
  }
  return record;
}

export async function GET(request: Request) {
  const current = await getCurrentUser();
  if (!current) redirect("/login");

  const { searchParams } = new URL(request.url);
  const typeParam = searchParams.get("type");
  const type =
    typeParam === "summary" || typeParam === "payroll" || typeParam === "timesheet"
      ? typeParam
      : "detail";
  const formatParam = searchParams.get("format");

  if (type === "timesheet") {
    const { monday, userId } = resolveTimesheetFilters(paramsToRecord(searchParams), current);
    const weekEnd = addDays(monday, 6);
    const entries = await fetchMonthlyEntries({
      start: monday,
      end: addDays(monday, 7),
      userIds: [userId],
    });
    const grid = buildWeeklyTimesheetGrid(entries, monday);

    const employee =
      userId === current.user.id
        ? { full_name: current.fullName, email: current.user.email ?? null }
        : await fetchEmployeeById(userId);
    const employeeName = employee?.full_name || employee?.email || "Unknown";
    const employeeEmail = employee?.email ?? "";

    const format = formatParam === "pdf" ? "pdf" : "xlsx";
    const filename = `timesheet-${monday}`;

    if (format === "pdf") {
      const buffer = await buildWeeklyTimesheetPdf({
        employeeName,
        employeeEmail,
        weekStartLabel: formatDateLabel(monday),
        weekEndLabel: formatDateLabel(weekEnd),
        jobs: grid.jobs,
        hours: grid.hours,
        dayTotals: grid.dayTotals,
        jobTotals: grid.jobTotals,
        grandTotal: grid.grandTotal,
      });
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        },
      });
    }

    const header = ["Day", ...grid.jobs, "Total"];
    const rows = DAY_NAMES.map((day, i) => [
      day,
      ...grid.jobs.map((_, j) => String(grid.hours[i][j])),
      String(grid.dayTotals[i]),
    ]);
    rows.push(["Total", ...grid.jobTotals.map(String), String(grid.grandTotal)]);

    const buffer = await buildXlsx([
      {
        sheetName: "Timesheet",
        header,
        rows,
        options: { stripeCount: DAY_NAMES.length, headerColor: HEADER_COLOR },
      },
    ]);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      },
    });
  }

  if (type === "payroll") {
    if (current.role !== "admin") redirect("/reports");

    const periodStart = payPeriodStart(searchParams.get("period") || todayISO());
    const submittedOnly = searchParams.get("scope") !== "all";
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

    const employeeRowCount = calendarDataRows.length;

    const dayTotals = days.map((_, i) => calendarRows.reduce((sum, row) => sum + row.days[i], 0));
    const grandTotal = dayTotals.reduce((a, b) => a + b, 0);
    calendarDataRows.push([
      "Total",
      ...dayTotals.map((t) => (t > 0 ? String(t) : "")),
      String(grandTotal),
    ]);

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
      e.regular.toFixed(2),
      e.overtime.toFixed(2),
      e.weekend.toFixed(2),
      e.pto.toFixed(2),
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
          numberFormat: "0.00",
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

  // detail / summary share the same filter resolution and data fetch.
  const filters = resolveDetailFilters(paramsToRecord(searchParams), current);
  const entries = await fetchMonthlyEntries(filters);
  const format = formatParam === "xlsx" || formatParam === "pdf" ? formatParam : "csv";
  const filename = `${type}-${filters.start}-to-${addDays(filters.end, -1)}`;

  if (type === "summary") {
    const summary = summarizeByJob(entries);
    const header = ["Job", "Hours"];
    const rows = summary.map((s) => [s.job_name, String(s.hours)]);

    if (format === "xlsx") {
      const buffer = await buildXlsx([{ sheetName: "Summary", header, rows }]);
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
        },
      });
    }
    if (format === "pdf") {
      const buffer = await buildPdf("Summary Report", [
        { header, rows, colWidths: [300] },
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

  // type === "detail"
  const header = ["Date", "Employee", "Job", "Hours", "Notes", "Billed"];
  const rows = entries.map((e) => [
    e.entry_date,
    e.employee_name,
    e.job_name,
    String(e.hours),
    e.notes ?? "",
    e.billed ? "Yes" : "No",
  ]);

  if (format === "xlsx") {
    const buffer = await buildXlsx([{ sheetName: "Detail", header, rows }]);
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
    const buffer = await buildPdf("Detail Report", [
      {
        header: pdfHeader,
        rows: pdfRows,
        colWidths: [65, 90, 140, 42, 45],
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
