import { addDays } from "@/lib/dates";
import type { MonthlyEntry } from "@/lib/monthly-entries";

export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export interface WeeklyTimesheetGrid {
  jobs: string[];
  hours: number[][]; // [dayIndex 0-6][jobIndex], Monday..Sunday
  dayTotals: number[];
  jobTotals: number[];
  grandTotal: number;
}

// Powers the Reports page's "Timesheet" report — a single employee's week
// laid out as Day x Job, mirroring Weekly Overview's own grid but
// transposed (that page groups by job row / day column; a printable
// timesheet reads more naturally as day row / job column).
export function buildWeeklyTimesheetGrid(entries: MonthlyEntry[], monday: string): WeeklyTimesheetGrid {
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const jobs = [...new Set(entries.map((e) => e.job_name))].sort((a, b) => a.localeCompare(b));
  const hours: number[][] = days.map(() => jobs.map(() => 0));

  for (const entry of entries) {
    const dayIndex = days.indexOf(entry.entry_date);
    const jobIndex = jobs.indexOf(entry.job_name);
    if (dayIndex === -1 || jobIndex === -1) continue;
    hours[dayIndex][jobIndex] += entry.hours;
  }

  const jobTotals = jobs.map((_, j) => hours.reduce((sum, row) => sum + row[j], 0));
  const dayTotals = hours.map((row) => row.reduce((sum, h) => sum + h, 0));
  const grandTotal = dayTotals.reduce((a, b) => a + b, 0);

  return { jobs, hours, dayTotals, jobTotals, grandTotal };
}
