import { createClient } from "@/lib/supabase/server";
import { fetchMonthlyEntries } from "@/lib/monthly-entries";
import { addDays, mondayOf } from "@/lib/dates";
import type { EmployeePeriodHours } from "@/lib/types";

// Powers the Payroll page's Pay Period Calendar module: one row per
// employee, one column per day of a 14-day pay period. RLS already scopes
// this to "your own entries, or everyone's if you're an admin" —
// non-admins would just see a single row (themselves), so the page only
// renders this module for admins, where it's actually useful as a
// multi-employee overview.
export async function fetchPayPeriodCalendar(
  periodStart: string,
  submittedOnly: boolean
): Promise<EmployeePeriodHours[]> {
  const days = Array.from({ length: 14 }, (_, i) => addDays(periodStart, i));
  const periodEnd = addDays(periodStart, 14);

  const entries = await fetchMonthlyEntries({ start: periodStart, end: periodEnd });

  let allowedWeeks: Set<string> | null = null;
  if (submittedOnly) {
    const week1 = periodStart;
    const week2 = addDays(periodStart, 7);
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("week_submissions")
      .select("user_id, week_start")
      .in("week_start", [week1, week2]);

    if (error) {
      console.error("fetchPayPeriodCalendar: week_submissions lookup failed:", error);
    }
    allowedWeeks = new Set((data ?? []).map((row) => `${row.user_id}|${row.week_start}`));
  }

  const byEmployee = new Map<string, EmployeePeriodHours>();
  for (const entry of entries) {
    if (allowedWeeks) {
      const key = `${entry.user_id}|${mondayOf(entry.entry_date)}`;
      if (!allowedWeeks.has(key)) continue;
    }

    const dayIndex = days.indexOf(entry.entry_date);
    if (dayIndex === -1) continue;

    const row =
      byEmployee.get(entry.user_id) ??
      ({
        user_id: entry.user_id,
        employee_name: entry.employee_name,
        days: Array(14).fill(0),
        total: 0,
      } satisfies EmployeePeriodHours);

    row.days[dayIndex] += entry.hours;
    row.total += entry.hours;
    byEmployee.set(entry.user_id, row);
  }

  return Array.from(byEmployee.values()).sort((a, b) =>
    a.employee_name.localeCompare(b.employee_name)
  );
}
