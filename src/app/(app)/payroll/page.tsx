import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { addMonths, currentMonth, formatMonthLabel, payPeriodStart, todayISO } from "@/lib/dates";
import { fetchSubmittedWeeksForMonth } from "@/lib/week-submissions";
import SubmittedWeeksTable from "./submitted-weeks-table";
import PayPeriodCalendar from "./pay-period-calendar";
import DismissibleBanner from "@/components/dismissible-banner";

function monthLink(month: string) {
  return `/payroll?month=${month}`;
}

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    period?: string;
    scope?: string;
    error?: string;
    success?: string;
  }>;
}) {
  const { month: monthParam, period: periodParam, scope: scopeParam, error, success } =
    await searchParams;

  const current = await getCurrentUser();
  if (!current) redirect("/login");

  const month = monthParam || currentMonth();
  const prevMonth = addMonths(month, -1);
  const nextMonth = addMonths(month, 1);
  const isAdmin = current.role === "admin";

  const periodStart = payPeriodStart(periodParam || todayISO());
  const scope = scopeParam === "submitted" ? "submitted" : "all";

  // No role filtering needed here — RLS already scopes the rows returned to
  // "your own submissions, or everyone's if you're an admin."
  const weeks = await fetchSubmittedWeeksForMonth(month);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">Payroll</p>
          <h1 className="text-2xl font-semibold text-gray-900">{formatMonthLabel(month)}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={monthLink(prevMonth)}
            className="rounded-md border border-blue-600 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50"
          >
            ← Prev month
          </Link>
          <Link
            href={monthLink(nextMonth)}
            className="rounded-md border border-blue-600 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50"
          >
            Next month →
          </Link>
        </div>
      </div>

      {error && <DismissibleBanner message={error} variant="error" />}
      {success && <DismissibleBanner message="Saved." variant="success" />}

      <div className="space-y-2">
        <h2 className="text-base font-bold text-gray-900">Submitted Weeks</h2>
        <p className="text-xs text-gray-400">
          Click a week to see its hours by job.
          {isAdmin && " Toggle a week off to unlock it for the employee again."}
        </p>
        <SubmittedWeeksTable weeks={weeks} isAdmin={isAdmin} />
      </div>

      {isAdmin && <PayPeriodCalendar periodStart={periodStart} scope={scope} />}
    </div>
  );
}
