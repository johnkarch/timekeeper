import { fetchMonthlyEntries } from "@/lib/monthly-entries";
import { fetchPtoBalances, PTO_JOB_PATTERN } from "@/lib/pto";
import { fetchAllEmployees } from "@/lib/employees";
import { mondayOf } from "@/lib/dates";
import type { EmployeeStatistics } from "@/lib/types";

const OVERTIME_THRESHOLD = 40; // hours per week

// Splits a map of week-start -> hours worked that week into regular/overtime
// at the 40-hour mark. Works for any date range (a 14-day pay period, a
// year-to-date span, ...) since it buckets by calendar week rather than
// assuming exactly two weeks like the Payroll page's pay-period version does.
export function bucketRegularOvertime(weeklyWorked: Map<string, number>): {
  regular: number;
  overtime: number;
} {
  let regular = 0;
  let overtime = 0;
  for (const hours of weeklyWorked.values()) {
    regular += Math.min(hours, OVERTIME_THRESHOLD);
    overtime += Math.max(hours - OVERTIME_THRESHOLD, 0);
  }
  return { regular, overtime };
}

interface WorkingTotals {
  employee_name: string;
  weeklyWorked: Map<string, number>;
  weekend: number;
  pto: number;
  billed: number;
  unbilled: number;
}

// Powers the Business Management page's Employee Statistics table. Every
// employee appears even with zero hours in range, so their PTO balance still
// shows up. Categories follow the same mutually-exclusive bucketing as
// src/lib/employee-hours.ts (PTO first, then weekend, then regular/overtime).
export async function fetchEmployeeStatistics(
  start: string,
  end: string
): Promise<EmployeeStatistics[]> {
  const [employees, entries, ptoBalances] = await Promise.all([
    fetchAllEmployees(),
    fetchMonthlyEntries({ start, end }),
    fetchPtoBalances(),
  ]);

  const byEmployee = new Map<string, WorkingTotals>();
  for (const employee of employees) {
    byEmployee.set(employee.id, {
      employee_name: employee.full_name || employee.email || "Unknown",
      weeklyWorked: new Map(),
      weekend: 0,
      pto: 0,
      billed: 0,
      unbilled: 0,
    });
  }

  for (const entry of entries) {
    const totals = byEmployee.get(entry.user_id);
    if (!totals) continue;

    if (entry.billed) totals.billed += entry.hours;
    else totals.unbilled += entry.hours;

    if (PTO_JOB_PATTERN.test(entry.job_name)) {
      totals.pto += entry.hours;
    } else {
      const dayOfWeek = new Date(`${entry.entry_date}T12:00:00Z`).getUTCDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        totals.weekend += entry.hours;
      } else {
        const weekStart = mondayOf(entry.entry_date);
        totals.weeklyWorked.set(weekStart, (totals.weeklyWorked.get(weekStart) ?? 0) + entry.hours);
      }
    }
  }

  return Array.from(byEmployee.entries())
    .map(([user_id, totals]) => {
      const { regular, overtime } = bucketRegularOvertime(totals.weeklyWorked);
      return {
        user_id,
        employee_name: totals.employee_name,
        regular,
        overtime,
        weekend: totals.weekend,
        pto: totals.pto,
        billed_hours: totals.billed,
        unbilled_hours: totals.unbilled,
        pto_balance: ptoBalances.get(user_id) ?? 0,
      };
    })
    .sort((a, b) => a.employee_name.localeCompare(b.employee_name));
}
