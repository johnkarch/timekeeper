import { describe, it, expect } from "vitest";
import { summarizeByJob } from "./job-summary";
import type { MonthlyEntry } from "./monthly-entries";

function entry(overrides: Partial<MonthlyEntry>): MonthlyEntry {
  return {
    id: "id",
    entry_date: "2026-08-24",
    hours: 0,
    notes: null,
    billed: false,
    job_name: "100001 Job A",
    employee_name: "Employee",
    user_id: "user-1",
    ...overrides,
  };
}

describe("summarizeByJob", () => {
  it("returns an empty array for no entries", () => {
    expect(summarizeByJob([])).toEqual([]);
  });

  it("returns one row summing hours for a single job", () => {
    const entries = [
      entry({ id: "1", job_name: "100001 Job A", hours: 3 }),
      entry({ id: "2", job_name: "100001 Job A", hours: 2 }),
    ];
    expect(summarizeByJob(entries)).toEqual([{ job_name: "100001 Job A", hours: 5 }]);
  });

  it("keeps multiple jobs separate, sorted alphabetically", () => {
    const entries = [
      entry({ id: "1", job_name: "200002 Job B", hours: 4 }),
      entry({ id: "2", job_name: "100001 Job A", hours: 1 }),
      entry({ id: "3", job_name: "100001 Job A", hours: 2 }),
    ];
    expect(summarizeByJob(entries)).toEqual([
      { job_name: "100001 Job A", hours: 3 },
      { job_name: "200002 Job B", hours: 4 },
    ]);
  });

  it("sums hours for the same job across different dates and employees", () => {
    const entries = [
      entry({ id: "1", job_name: "100001 Job A", hours: 5, entry_date: "2026-08-24", user_id: "user-1" }),
      entry({ id: "2", job_name: "100001 Job A", hours: 7, entry_date: "2026-08-25", user_id: "user-2" }),
    ];
    expect(summarizeByJob(entries)).toEqual([{ job_name: "100001 Job A", hours: 12 }]);
  });
});
