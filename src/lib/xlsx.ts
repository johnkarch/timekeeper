import ExcelJS from "exceljs";

const NUMERIC = /^\d+(\.\d+)?$/;

// Builds a single-sheet workbook from the same header/rows shape used for
// CSV export. Cells that look like plain numbers (e.g. Hours) are written as
// real numbers rather than text, so totals work if someone sums the column
// in Excel.
export async function buildXlsx(
  sheetName: string,
  header: string[],
  rows: string[][]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  sheet.addRow(header);
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow(row.map((cell) => (NUMERIC.test(cell) ? Number(cell) : cell)));
  }

  sheet.columns.forEach((col, i) => {
    const headerLen = header[i]?.length ?? 10;
    const maxRowLen = rows.reduce((max, row) => Math.max(max, row[i]?.length ?? 0), 0);
    col.width = Math.min(Math.max(headerLen, maxRowLen) + 2, 40);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
