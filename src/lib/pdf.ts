import PDFDocument from "pdfkit";

// Renders the same header/rows shape used for CSV/Excel export as a simple
// paginated table. Good enough for a timesheet printout — not trying to
// reproduce the on-screen table's styling.
export function buildPdf(title: string, header: string[], rows: string[][]): Promise<Buffer> {
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
    const colWidth = usableWidth / header.length;
    const rowHeight = 18;

    function drawRow(cells: string[], y: number, bold: boolean) {
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9);
      cells.forEach((cell, i) => {
        doc.text(cell, startX + i * colWidth, y, { width: colWidth - 6, ellipsis: true });
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
