import PDFDocument from "pdfkit";
import { DAY_NAMES } from "@/lib/weekly-timesheet";

// Same teal used by the app's own header bar and every other PDF export's
// header row (src/lib/pdf.ts, src/app/api/export/reports/route.ts) — this
// one just leans on it more, matching the "Teal Brand" template the user
// picked out of three mockups.
const TEAL = "#3d8f86";
const LIGHT_TEAL = "#e6f2f1";
const DARK = "#1f2937";

export interface WeeklyTimesheetPdfInput {
  employeeName: string;
  employeeEmail: string;
  weekStartLabel: string;
  weekEndLabel: string;
  jobs: string[];
  hours: number[][]; // [dayIndex][jobIndex]
  dayTotals: number[];
  jobTotals: number[];
  grandTotal: number;
}

function fmtHours(n: number): string {
  return n > 0 ? String(n) : "–";
}

export function buildWeeklyTimesheetPdf(input: WeeklyTimesheetPdfInput): Promise<Buffer> {
  const {
    employeeName,
    employeeEmail,
    weekStartLabel,
    weekEndLabel,
    jobs,
    hours,
    dayTotals,
    jobTotals,
    grandTotal,
  } = input;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "letter", layout: "landscape", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const startX = doc.page.margins.left;
    const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    doc.rect(0, 0, doc.page.width, 64).fill(TEAL);
    doc.fillColor("white").font("Helvetica-Bold").fontSize(20).text("Weekly Timesheet", startX, 22);
    doc
      .font("Helvetica")
      .fontSize(10)
      .text("Timekeeper", doc.page.width - 220, 20, { width: 180, align: "right" });
    doc
      .fontSize(10)
      .text(`Week of ${weekStartLabel} – ${weekEndLabel}`, doc.page.width - 220, 36, {
        width: 180,
        align: "right",
      });

    let y = 90;
    doc.fillColor("black").font("Helvetica-Bold").fontSize(11).text("Employee:", startX, y);
    doc
      .font("Helvetica")
      .text(
        employeeEmail ? `${employeeName}   (${employeeEmail})` : employeeName,
        startX + 65,
        y
      );
    y += 28;

    if (jobs.length === 0) {
      doc.font("Helvetica").fontSize(11).fillColor("#6b7280").text("No entries this week.", startX, y);
      doc.end();
      return;
    }

    const dayColWidth = 110;
    const totalColWidth = 80;
    const jobColWidth = (usableWidth - dayColWidth - totalColWidth) / jobs.length;
    const colWidths = [dayColWidth, ...jobs.map(() => jobColWidth), totalColWidth];
    const headerCells = ["Day", ...jobs, "Total"];
    const colX = colWidths.map((_, i) => startX + colWidths.slice(0, i).reduce((s, w) => s + w, 0));
    const rowHeight = 26;

    function cell(
      text: string,
      x: number,
      rowY: number,
      width: number,
      align: "left" | "right" = "left"
    ) {
      doc.text(text, x + 8, rowY + 8, {
        width: width - 16,
        height: rowHeight - 8,
        ellipsis: true,
        align,
      });
    }

    doc.rect(startX, y, usableWidth, rowHeight).fill(TEAL);
    headerCells.forEach((c, i) => {
      doc.fillColor("white").font("Helvetica-Bold").fontSize(9.5);
      cell(c, colX[i], y, colWidths[i]);
    });
    y += rowHeight;

    DAY_NAMES.forEach((day, i) => {
      if (i % 2 === 1) doc.rect(startX, y, usableWidth, rowHeight).fill(LIGHT_TEAL);

      doc.fillColor(DARK).font("Helvetica-Bold").fontSize(9.5);
      cell(day, colX[0], y, colWidths[0]);

      jobs.forEach((_, j) => {
        doc.font("Helvetica").fillColor(DARK);
        cell(fmtHours(hours[i][j]), colX[j + 1], y, colWidths[j + 1], "right");
      });

      doc.font("Helvetica-Bold");
      cell(fmtHours(dayTotals[i]), colX[colX.length - 1], y, colWidths[colWidths.length - 1], "right");
      y += rowHeight;
    });

    doc.rect(startX, y, usableWidth, rowHeight).fill(DARK);
    doc.fillColor("white").font("Helvetica-Bold").fontSize(9.5);
    cell("Total", colX[0], y, colWidths[0]);
    jobs.forEach((_, j) => {
      cell(fmtHours(jobTotals[j]), colX[j + 1], y, colWidths[j + 1], "right");
    });
    cell(fmtHours(grandTotal), colX[colX.length - 1], y, colWidths[colWidths.length - 1], "right");

    doc.end();
  });
}
