import { addDays, addMonths, currentMonth, firstOfMonth } from "@/lib/dates";
import type { CurrentUser } from "@/lib/auth";

export interface ResolvedReportFilters {
  start: string;
  end: string; // exclusive, matching MonthlyFilters — see note below
  billed?: "billed" | "unbilled";
  userIds?: string[]; // undefined = no filter (admin only; everyone included)
  jobIds?: string[];
}

function toArray(value: string | string[] | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value : [value];
}

// Shared by the Reports page (preview) and the export route, so the two can
// never disagree about what a given request is allowed to see. Defaults the
// date range to the current month when none is given. Non-admins are
// force-locked to their own hours regardless of what an `employee_id` param
// asks for — RLS already prevents any actual data leak (see "time_entries:
// read own or read all if admin" in schema.sql), but resolving it here too
// keeps the UI and the query honest about who's allowed to pick what.
//
// The `end` query param is the last day INCLUDED in the report (natural for
// a date `<input>`), but fetchMonthlyEntries expects an EXCLUSIVE end bound
// — this is the one place that conversion happens, so callers on both the
// page and the export route stay in sync.
export function resolveDetailFilters(
  searchParams: Record<string, string | string[] | undefined>,
  current: CurrentUser
): ResolvedReportFilters {
  const month = currentMonth();
  const start = typeof searchParams.start === "string" ? searchParams.start : firstOfMonth(month);
  const end =
    typeof searchParams.end === "string"
      ? addDays(searchParams.end, 1)
      : firstOfMonth(addMonths(month, 1));

  const billed =
    searchParams.billed === "billed" || searchParams.billed === "unbilled"
      ? searchParams.billed
      : undefined;

  const jobIds = toArray(searchParams.job_id);
  const userIds =
    current.role === "admin" ? toArray(searchParams.employee_id) : [current.user.id];

  return { start, end, billed, userIds, jobIds };
}
