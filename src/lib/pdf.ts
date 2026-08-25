import PDFDocument from "pdfkit";

// Renders the same header/rows shape used for CSV/Excel export as a simple
// paginated table. Good enough for a timesheet printout — not trying to
// reproduce the on-screen table's styling.
//
// `colWidths` gives a fixed width (in points) for every column except the
// last one — the last column always takes whatever width is left, so its
// right edge lands on the page margin rather than on another fixed column.
export function buildPdf(
  title: string,
  header: string[],
  rows: string[][],
  colWidths: number[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "letter", margin: 40, layout: "landscape" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(16).font("Helvetica-Bold").text(title);
    doc.moveDown(0.5);

    const startX = doc.page.margins.left;
    const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    const fixedWidth = colWidths.reduce((sum, w) => sum + w, 0);
    const widths = [...colWidths, usableWidth - fixedWidth];
    const colX = widths.map((_, i) =>
      i === 0 ? startX : startX + widths.slice(0, i).reduce((sum, w) => sum + w, 0)
    );

    const rowHeight = 18;

    function drawRow(cells: string[], y: number, bold: boolean) {
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9);
      cells.forEach((cell, i) => {
        // Without an explicit height, pdfkit wraps overflowing text across
        // multiple lines instead of truncating it — `ellipsis` only kicks in
        // once height is bounded, which is what actually keeps each cell to
        // a single line so it can't bleed into the row below.
        doc.text(cell, colX[i], y, {
          width: widths[i] - 6,
          height: rowHeight - 6,
          ellipsis: true,
        });
      });
    }

    function drawHeader(y: number) {
      drawRow(header, y, true);
      doc
        .moveTo(startX, y + rowHeight - 4)
        .lineTo(startX + usableWidth, y + rowHeight - 4)
        .strokeColor("#cccccc")
        .stroke();
    }

    let y = doc.y;
    drawHeader(y);
    y += rowHeight;

    const bottomLimit = doc.page.height - doc.page.margins.bottom;
    for (const row of rows) {
      if (y + rowHeight > bottomLimit) {
        doc.addPage();
        y = doc.page.margins.top;
        drawHeader(y);
        y += rowHeight;
      }
      drawRow(row, y, false);
      y += rowHeight;
    }

    if (rows.length === 0) {
      doc.font("Helvetica").fontSize(9).text("No entries.", startX, y);
    }

    doc.end();
  });
}
