import { describe, it, expect } from "vitest";
import { csvEscape, toCsv } from "./csv";

describe("csvEscape", () => {
  it("leaves plain text unchanged", () => {
    expect(csvEscape("100001 KAIN - Modern Escape")).toBe("100001 KAIN - Modern Escape");
  });

  it("leaves an empty string unchanged", () => {
    expect(csvEscape("")).toBe("");
  });

  it("quotes a value containing a comma", () => {
    expect(csvEscape("Green Bay, WI")).toBe('"Green Bay, WI"');
  });

  it("quotes and doubles internal double-quotes", () => {
    expect(csvEscape('Say "hi"')).toBe('"Say ""hi"""');
  });

  it("quotes a value containing a newline", () => {
    expect(csvEscape("line one\nline two")).toBe('"line one\nline two"');
  });
});

describe("toCsv", () => {
  it("joins cells with commas and rows with CRLF", () => {
    const csv = toCsv([
      ["Date", "Job", "Hours"],
      ["2026-08-24", "100001 Test Job", "8"],
    ]);
    expect(csv).toBe("Date,Job,Hours\r\n2026-08-24,100001 Test Job,8");
  });

  it("escapes cells that need it while building the full CSV", () => {
    const csv = toCsv([
      ["Job", "Notes"],
      ["100001 KAIN - Modern Escape", "on-site, 8am"],
    ]);
    expect(csv).toBe('Job,Notes\r\n100001 KAIN - Modern Escape,"on-site, 8am"');
  });

  it("returns an empty string for no rows", () => {
    expect(toCsv([])).toBe("");
  });
});
