import { describe, it, expect } from "vitest";
import { buildWeeklyTimesheetGrid } from "./weekly-timesheet";
import type { MonthlyEntry } from "./monthly-entries";

const MONDAY = "2026-09-21"; // Monday..Sunday = 2026-09-21..2026-09-27

function entry(overrides: Partial<MonthlyEntry>): MonthlyEntry {
  return {
    id: "id",
    entry_date: MONDAY,
    hours: 0,
    notes: null,
    billed: false,
    job_name: "100001 Job A",
    employee_name: "Employee",
    user_id: "user-1",
    ...overrides,
  };
}

describe("buildWeeklyTimesheetGrid", () => {
  it("returns an empty grid for no entries", () => {
    const grid = buildWeeklyTimesheetGrid([], MONDAY);
    expect(grid.jobs).toEqual([]);
    expect(grid.hours).toEqual(Array.from({ length: 7 }, () => []));
    expect(grid.dayTotals).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(grid.jobTotals).toEqual([]);
    expect(grid.grandTotal).toBe(0);
  });

  it("places a single entry in the right day row and job column", () => {
    const grid = buildWeeklyTimesheetGrid(
      [entry({ entry_date: "2026-09-23", job_name: "100001 Job A", hours: 4 })],
      MONDAY
    );
    expect(grid.jobs).toEqual(["100001 Job A"]);
    expect(grid.hours[2]).toEqual([4]); // Wednesday = index 2
    expect(grid.dayTotals[2]).toBe(4);
    expect(grid.jobTotals).toEqual([4]);
    expect(grid.grandTotal).toBe(4);
  });

  it("sums multiple entries for the same day and job", () => {
    const grid = buildWeeklyTimesheetGrid(
      [
        entry({ entry_date: MONDAY, job_name: "100001 Job A", hours: 3 }),
        entry({ entry_date: MONDAY, job_name: "100001 Job A", hours: 2 }),
      ],
      MONDAY
    );
    expect(grid.hours[0]).toEqual([5]);
    expect(grid.jobTotals).toEqual([5]);
  });

  it("keeps multiple jobs as separate columns, sorted alphabetically", () => {
    const grid = buildWeeklyTimesheetGrid(
      [
        entry({ entry_date: MONDAY, job_name: "200002 Job B", hours: 4 }),
        entry({ entry_date: MONDAY, job_name: "100001 Job A", hours: 1 }),
        entry({ entry_date: "2026-09-27", job_name: "100001 Job A", hours: 2 }),
      ],
      MONDAY
    );
    expect(grid.jobs).toEqual(["100001 Job A", "200002 Job B"]);
    expect(grid.hours[0]).toEqual([1, 4]); // Monday
    expect(grid.hours[6]).toEqual([2, 0]); // Sunday
    expect(grid.jobTotals).toEqual([3, 4]);
    expect(grid.dayTotals).toEqual([5, 0, 0, 0, 0, 0, 2]);
    expect(grid.grandTotal).toBe(7);
  });

  it("ignores an entry whose date falls outside the given week", () => {
    const grid = buildWeeklyTimesheetGrid(
      [entry({ entry_date: "2026-09-28", job_name: "100001 Job A", hours: 5 })],
      MONDAY
    );
    expect(grid.jobs).toEqual(["100001 Job A"]);
    expect(grid.hours.every((row) => row[0] === 0)).toBe(true);
    expect(grid.jobTotals).toEqual([0]);
    expect(grid.grandTotal).toBe(0);
  });
});
