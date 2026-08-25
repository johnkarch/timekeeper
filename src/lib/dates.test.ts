import { describe, it, expect, afterEach, vi } from "vitest";
import {
  mondayOf,
  addDays,
  addMonths,
  firstOfMonth,
  formatDateLabel,
  formatMonthLabel,
  todayISO,
  currentMonth,
  payPeriodStart,
  shortDayLabel,
} from "./dates";

// 2026-08-24 is a known Monday — used as a fixed anchor throughout so the
// tests don't depend on when they're run.

describe("mondayOf", () => {
  it("returns the same date when already a Monday", () => {
    expect(mondayOf("2026-08-24")).toBe("2026-08-24");
  });

  it("rolls a Sunday back to that week's Monday", () => {
    expect(mondayOf("2026-08-30")).toBe("2026-08-24");
  });

  it("rolls a midweek date back to that week's Monday", () => {
    expect(mondayOf("2026-08-27")).toBe("2026-08-24");
  });

  it("handles a week that spans a month boundary", () => {
    // 2026-09-06 is a Sunday in the week starting 2026-08-31.
    expect(mondayOf("2026-09-06")).toBe("2026-08-31");
  });

  it("handles a week that spans a year boundary", () => {
    // 2027-01-01 is a Friday in the week starting 2026-12-28.
    expect(mondayOf("2027-01-01")).toBe("2026-12-28");
  });
});

describe("addDays", () => {
  it("adds days within the same month", () => {
    expect(addDays("2026-08-24", 6)).toBe("2026-08-30");
  });

  it("subtracts days (going back a week)", () => {
    expect(addDays("2026-08-24", -7)).toBe("2026-08-17");
  });

  it("rolls over a month boundary", () => {
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
  });

  it("rolls over a year boundary", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("handles a leap day correctly", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2028-02-29", 1)).toBe("2028-03-01");
  });
});

describe("addMonths", () => {
  it("adds a month within the same year", () => {
    expect(addMonths("2026-08", 1)).toBe("2026-09");
  });

  it("subtracts a month within the same year", () => {
    expect(addMonths("2026-08", -1)).toBe("2026-07");
  });

  it("rolls forward over a year boundary", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
  });

  it("rolls backward over a year boundary", () => {
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });

  it("handles a full year jump", () => {
    expect(addMonths("2026-08", 12)).toBe("2027-08");
    expect(addMonths("2026-08", -12)).toBe("2025-08");
  });
});

describe("firstOfMonth", () => {
  it("appends -01 to a YYYY-MM string", () => {
    expect(firstOfMonth("2026-08")).toBe("2026-08-01");
  });
});

describe("formatDateLabel", () => {
  it("formats a date as weekday, month, day", () => {
    expect(formatDateLabel("2026-08-24")).toBe("Mon, Aug 24");
  });
});

describe("formatMonthLabel", () => {
  it("formats a month as full month name and year", () => {
    expect(formatMonthLabel("2026-08")).toBe("August 2026");
  });
});

describe("payPeriodStart", () => {
  // 2026-08-24 lands exactly on a 14-day period boundary from the fixed
  // anchor, so its period runs 2026-08-24 through 2026-09-06.

  it("returns the same date when already on a period boundary", () => {
    expect(payPeriodStart("2026-08-24")).toBe("2026-08-24");
  });

  it("stays in the same period for the rest of week one", () => {
    expect(payPeriodStart("2026-08-27")).toBe("2026-08-24");
  });

  it("stays in the same period for all of week two", () => {
    expect(payPeriodStart("2026-08-31")).toBe("2026-08-24");
    expect(payPeriodStart("2026-09-06")).toBe("2026-08-24");
  });

  it("rolls forward to the next period on day 15", () => {
    expect(payPeriodStart("2026-09-07")).toBe("2026-09-07");
  });

  it("rolls backward to the previous period the day before", () => {
    expect(payPeriodStart("2026-08-23")).toBe("2026-08-10");
  });
});

describe("shortDayLabel", () => {
  it("returns a single-letter weekday and an M/D date", () => {
    expect(shortDayLabel("2026-08-24")).toEqual({ weekday: "M", date: "8/24" });
  });

  it("handles a single-digit day and double-digit month", () => {
    expect(shortDayLabel("2026-12-03")).toEqual({ weekday: "T", date: "12/3" });
  });
});

describe("todayISO / currentMonth", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a well-formed YYYY-MM-DD date", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns a well-formed YYYY-MM month", () => {
    expect(currentMonth()).toMatch(/^\d{4}-\d{2}$/);
  });

  it("currentMonth is always a prefix of todayISO", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-24T12:00:00Z"));
    expect(todayISO().startsWith(currentMonth())).toBe(true);
  });
});
