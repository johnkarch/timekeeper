import PDFDocument from "pdfkit";

// Light grey used to shade alternating rows — matches the app's own
// bg-gray-100 elsewhere in the UI.
const STRIPE_FILL = "#f3f4f6";

export interface PdfTableOptions {
  // Shades every other one of the FIRST this-many rows light grey — e.g.
  // pass the number of employee rows so a trailing totals row underneath
  // them stays unshaded rather than participating in the alternating
  // pattern by coincidence.
  stripeCount?: number;
  // If given, the header row gets this background color with white bold
  // text, instead of the default plain header with a thin rule underneath.
  headerColor?: string;
}

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
  colWidths: number[],
  options: PdfTableOptions = {}
): Promise<Buffer> {
  const { stripeCount = 0, headerColor } = options;

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

    function drawRow(cells: string[], y: number, isHeaderRow: boolean, striped = false) {
      if (isHeaderRow && headerColor) {
        doc.rect(startX, y - 2, usableWidth, rowHeight - 2).fill(headerColor);
      } else if (!isHeaderRow && striped) {
        doc.rect(startX, y - 2, usableWidth, rowHeight - 2).fill(STRIPE_FILL);
      }

      cells.forEach((cell, i) => {
        doc.fillColor(isHeaderRow && headerColor ? "white" : "black");
        doc.font(isHeaderRow ? "Helvetica-Bold" : "Helvetica").fontSize(9);
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
      if (!headerColor) {
        doc
          .moveTo(startX, y + rowHeight - 4)
          .lineTo(startX + usableWidth, y + rowHeight - 4)
          .strokeColor("#cccccc")
          .stroke();
      }
    }

    let y = doc.y;
    drawHeader(y);
    y += rowHeight;

    const bottomLimit = doc.page.height - doc.page.margins.bottom;
    rows.forEach((row, i) => {
      if (y + rowHeight > bottomLimit) {
        doc.addPage();
        y = doc.page.margins.top;
        drawHeader(y);
        y += rowHeight;
      }
      drawRow(row, y, false, i < stripeCount && i % 2 === 1);
      y += rowHeight;
    });

    if (rows.length === 0) {
      doc.font("Helvetica").fontSize(9).text("No entries.", startX, y);
    }

    doc.end();
  });
}
