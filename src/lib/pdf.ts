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

export interface PdfSection {
  // Optional sub-heading printed above this table.
  heading?: string;
  header: string[];
  rows: string[][];
  // A fixed width (in points) for every column except the last one — the
  // last column always takes whatever width is left, so its right edge
  // lands on the page margin rather than on another fixed column.
  colWidths: number[];
  options?: PdfTableOptions;
}

// Renders one or more header/rows tables (the same shape used for CSV/Excel
// export) as a simple paginated document — good enough for a timesheet
// printout, not trying to reproduce the on-screen table's styling. Sections
// flow one after another on the same page with a gap between them, and only
// spill onto a new page if they actually run out of room — small reports
// stay a single page rather than always splitting once a second section
// exists.
export function buildPdf(title: string, sections: PdfSection[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "letter", margin: 40, layout: "landscape" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const startX = doc.page.margins.left;
    const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const bottomLimit = doc.page.height - doc.page.margins.bottom;
    const rowHeight = 18;

    doc.fontSize(16).font("Helvetica-Bold").text(title);
    doc.moveDown(0.5);

    let y = doc.y;

    function ensureRoom(height: number) {
      if (y + height > bottomLimit) {
        doc.addPage();
        y = doc.page.margins.top;
      }
    }

    sections.forEach((section, sectionIndex) => {
      const { header, rows, colWidths, options = {} } = section;
      const { stripeCount = 0, headerColor } = options;

      if (sectionIndex > 0) {
        y += 14;
      }

      if (section.heading) {
        ensureRoom(rowHeight);
        doc.fillColor("black").font("Helvetica-Bold").fontSize(13).text(section.heading, startX, y);
        y = doc.y + 8;
      }

      const fixedWidth = colWidths.reduce((sum, w) => sum + w, 0);
      const widths = [...colWidths, usableWidth - fixedWidth];
      const colX = widths.map((_, i) =>
        i === 0 ? startX : startX + widths.slice(0, i).reduce((sum, w) => sum + w, 0)
      );

      function drawRow(cells: string[], rowY: number, isHeaderRow: boolean, striped = false) {
        if (isHeaderRow && headerColor) {
          doc.rect(startX, rowY - 2, usableWidth, rowHeight - 2).fill(headerColor);
        } else if (!isHeaderRow && striped) {
          doc.rect(startX, rowY - 2, usableWidth, rowHeight - 2).fill(STRIPE_FILL);
        }

        cells.forEach((cell, i) => {
          doc.fillColor(isHeaderRow && headerColor ? "white" : "black");
          doc.font(isHeaderRow ? "Helvetica-Bold" : "Helvetica").fontSize(9);
          // Without an explicit height, pdfkit wraps overflowing text across
          // multiple lines instead of truncating it — `ellipsis` only kicks
          // in once height is bounded, which is what actually keeps each
          // cell to a single line so it can't bleed into the row below.
          doc.text(cell, colX[i], rowY, {
            width: widths[i] - 6,
            height: rowHeight - 6,
            ellipsis: true,
          });
        });
      }

      function drawHeader(headerY: number) {
        drawRow(header, headerY, true);
        if (!headerColor) {
          doc
            .moveTo(startX, headerY + rowHeight - 4)
            .lineTo(startX + usableWidth, headerY + rowHeight - 4)
            .strokeColor("#cccccc")
            .stroke();
        }
      }

      ensureRoom(rowHeight);
      drawHeader(y);
      y += rowHeight;

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
        y += rowHeight;
      }
    });

    doc.end();
  });
}
