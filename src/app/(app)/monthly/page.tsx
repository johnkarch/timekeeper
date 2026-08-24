import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { addMonths, currentMonth, firstOfMonth, formatMonthLabel } from "@/lib/dates";
import { fetchMonthlyEntries } from "@/lib/monthly-entries";
import { bulkUpdateBilled } from "./actions";
import EntrySelection from "./entry-selection";
import JobSearchField from "@/app/(app)/job-search-field";

function monthLink(month: string, billed?: string, q?: string) {
  const params = new URLSearchParams({ month });
  if (billed) params.set("billed", billed);
  if (q) params.set("q", q);
  return `/monthly?${params.toString()}`;
}

export default async function MonthlyPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; billed?: string; q?: string; error?: string; success?: string }>;
}) {
  const { month: monthParam, billed: billedParam, q, error, success } = await searchParams;

  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (current.role !== "admin") redirect("/time-entries");

  const month = monthParam || currentMonth();
  const start = firstOfMonth(month);
  const end = firstOfMonth(addMonths(month, 1));
  const prevMonth = addMonths(month, -1);
  const nextMonth = addMonths(month, 1);

  const billedFilter = billedParam === "billed" || billedParam === "unbilled" ? billedParam : undefined;

  const entries = await fetchMonthlyEntries({ start, end, billed: billedFilter, q });

  // The unbilled subtotal always reflects every unbilled entry this month
  // (still respecting the job search), regardless of the billed/unbilled/all
  // toggle above — that's the number that actually matters for invoicing.
  const unbilledEntries =
    billedFilter === "unbilled" ? entries : await fetchMonthlyEntries({ start, end, billed: "unbilled", q });

  const byJob = new Map<string, { job_name: string; hours: number }>();
  for (const e of unbilledEntries) {
    const existing = byJob.get(e.job_name);
    if (existing) {
      existing.hours += e.hours;
    } else {
      byJob.set(e.job_name, { job_name: e.job_name, hours: e.hours });
    }
  }
  const unbilledSubtotals = Array.from(byJob.values()).sort((a, b) =>
    a.job_name.localeCompare(b.job_name)
  );
  const totalUnbilledHours = unbilledEntries.reduce((sum, e) => sum + e.hours, 0);

  const exportParams = new URLSearchParams({ month });
  if (billedFilter) exportParams.set("billed", billedFilter);
  if (q) exportParams.set("q", q);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">Monthly view</p>
          <h1 className="text-2xl font-semibold text-gray-900">{formatMonthLabel(month)}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={monthLink(prevMonth, billedFilter, q)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            ← Prev month
          </Link>
          <Link
            href={monthLink(nextMonth, billedFilter, q)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            Next month →
          </Link>
        </div>
      </div>

      <form
        method="GET"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4"
      >
        <div>
          <label htmlFor="month" className="mb-1 block text-sm font-medium text-gray-700">
            Month
          </label>
          <input
            id="month"
            name="month"
            type="month"
            defaultValue={month}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="billed" className="mb-1 block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            id="billed"
            name="billed"
            defaultValue={billedFilter ?? ""}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="unbilled">Unbilled</option>
            <option value="billed">Billed</option>
          </select>
        </div>
        <JobSearchField defaultValue={q ?? ""} />
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Apply
        </button>
        <a
          href={`/api/export/monthly?${exportParams.toString()}`}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          Export CSV
        </a>
      </form>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Updated.</p>
      )}

      <EntrySelection
        entries={entries}
        month={month}
        billedFilter={billedFilter ?? ""}
        q={q ?? ""}
        action={bulkUpdateBilled}
      />

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Unbilled hours by job</h2>
          <span className="text-sm font-medium text-gray-900">{totalUnbilledHours}h total</span>
        </div>
        {unbilledSubtotals.length === 0 ? (
          <p className="text-sm text-gray-500">Nothing unbilled this month.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {unbilledSubtotals.map((j) => (
              <li key={j.job_name} className="flex justify-between">
                <span>{j.job_name}</span>
                <span className="font-medium">{j.hours}h</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
