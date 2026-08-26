import { fetchMonthlyEntries } from "@/lib/monthly-entries";
import { addDays, mondayOf } from "@/lib/dates";
import { PTO_JOB_PATTERN } from "@/lib/pto";
import type { EmployeeHoursBreakdown } from "@/lib/types";

const OVERTIME_THRESHOLD = 40; // hours per week, not per pay period

// Powers the Payroll page's per-employee hour-category tiles. Always
// reflects every logged entry regardless of submission status — unlike the
// Pay Period Calendar above it, there's no "submitted only" scope here.
//
// Categories are mutually exclusive and sum to each employee's total hours:
//   1. PTO — any entry logged against a job matching PTO_JOB_PATTERN.
//   2. Weekend — remaining entries falling on a Saturday or Sunday.
//   3. Regular / Overtime — everything else, split per week (not per the
//      whole 14-day period) at the 40-hour threshold.
export async function fetchEmployeeHoursBreakdown(
  periodStart: string
): Promise<EmployeeHoursBreakdown[]> {
  const periodEnd = addDays(periodStart, 14);
  const week2Start = addDays(periodStart, 7);

  // RLS already scopes this to "your own entries, or everyone's if you're
  // an admin" — same as every other Payroll module.
  const entries = await fetchMonthlyEntries({ start: periodStart, end: periodEnd });

  interface WorkingTotals {
    employee_name: string;
    week1Worked: number;
    week2Worked: number;
    weekend: number;
    pto: number;
  }

  const byEmployee = new Map<string, WorkingTotals>();

  for (const entry of entries) {
    const totals = byEmployee.get(entry.user_id) ?? {
      employee_name: entry.employee_name,
      week1Worked: 0,
      week2Worked: 0,
      weekend: 0,
      pto: 0,
    };

    if (PTO_JOB_PATTERN.test(entry.job_name)) {
      totals.pto += entry.hours;
    } else {
      const dayOfWeek = new Date(`${entry.entry_date}T12:00:00Z`).getUTCDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        totals.weekend += entry.hours;
      } else if (mondayOf(entry.entry_date) === week2Start) {
        totals.week2Worked += entry.hours;
      } else {
        totals.week1Worked += entry.hours;
      }
    }

    byEmployee.set(entry.user_id, totals);
  }

  return Array.from(byEmployee.entries())
    .map(([user_id, totals]) => ({
      user_id,
      employee_name: totals.employee_name,
      regular:
        Math.min(totals.week1Worked, OVERTIME_THRESHOLD) +
        Math.min(totals.week2Worked, OVERTIME_THRESHOLD),
      overtime:
        Math.max(totals.week1Worked - OVERTIME_THRESHOLD, 0) +
        Math.max(totals.week2Worked - OVERTIME_THRESHOLD, 0),
      weekend: totals.weekend,
      pto: totals.pto,
    }))
    .sort((a, b) => a.employee_name.localeCompare(b.employee_name));
}
