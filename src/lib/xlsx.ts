import ExcelJS from "exceljs";

const NUMERIC = /^\d+(\.\d+)?$/;

// Light grey used to shade alternating rows — matches the app's own
// bg-gray-100 elsewhere in the UI. ARGB with a fully opaque alpha channel.
const STRIPE_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF3F4F6" },
};

const WHITE_BOLD: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" } };

function headerFill(hex: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb: `FF${hex.replace("#", "").toUpperCase()}` } };
}

export interface XlsxTableOptions {
  // Shades every other one of the FIRST this-many rows light grey — e.g.
  // pass the number of employee rows so a trailing totals row underneath
  // them stays unshaded rather than participating in the alternating
  // pattern by coincidence.
  stripeCount?: number;
  // If given (as a hex color), the header row gets this background with
  // white bold text.
  headerColor?: string;
}

// Builds a single-sheet workbook from the same header/rows shape used for
// CSV export. Cells that look like plain numbers (e.g. Hours) are written as
// real numbers rather than text, so totals work if someone sums the column
// in Excel.
export async function buildXlsx(
  sheetName: string,
  header: string[],
  rows: string[][],
  options: XlsxTableOptions = {}
): Promise<Buffer> {
  const { stripeCount = 0, headerColor } = options;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  const headerRow = sheet.addRow(header);
  headerRow.font = headerColor ? WHITE_BOLD : { bold: true };
  if (headerColor) {
    const fill = headerFill(headerColor);
    headerRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = fill;
    });
  }

  rows.forEach((row, i) => {
    const excelRow = sheet.addRow(row.map((cell) => (NUMERIC.test(cell) ? Number(cell) : cell)));
    const striped = i < stripeCount && i % 2 === 1;
    if (striped) {
      excelRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = STRIPE_FILL;
      });
    }
  });

  sheet.columns.forEach((col, i) => {
    const headerLen = header[i]?.length ?? 10;
    const maxRowLen = rows.reduce((max, row) => Math.max(max, row[i]?.length ?? 0), 0);
    col.width = Math.min(Math.max(headerLen, maxRowLen) + 2, 40);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
