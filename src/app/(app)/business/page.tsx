import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addDays, formatDateLabel, payPeriodStart, todayISO } from "@/lib/dates";
import { fetchAllEmployees } from "@/lib/employees";
import { fetchAllWorkTypes } from "@/lib/work-types";
import { fetchBillRates } from "@/lib/bill-rates";
import { fetchWageRates } from "@/lib/wage-rates";
import { fetchPtoAdjustments, fetchPtoBalances } from "@/lib/pto";
import { fetchEmployeeStatistics } from "@/lib/employee-statistics";
import { createWorkType } from "./actions";
import WorkTypeBlock from "./work-type-block";
import BillRatesSection from "./bill-rates-section";
import WageRatesPanel from "./wage-rates-panel";
import PtoPanel from "./pto-panel";
import EmployeeStatisticsPanel from "./employee-statistics-panel";
import DismissibleBanner from "@/components/dismissible-banner";
import SubmitButton from "@/components/submit-button";
import type { Job } from "@/lib/types";

async function fetchAllJobs(): Promise<Job[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("id, name, is_active")
    .order("name");

  if (error) {
    console.error("fetchAllJobs failed:", error);
    return [];
  }
  return data ?? [];
}

export default async function BusinessManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; period?: string; error?: string; success?: string }>;
}) {
  const { mode: modeParam, period: periodParam, error, success } = await searchParams;

  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (current.role !== "admin") redirect("/weekly");

  const mode = modeParam === "ytd" ? "ytd" : "period";
  const periodStart = payPeriodStart(periodParam || todayISO());

  const today = todayISO();
  const [statsStart, statsEnd, rangeLabel] =
    mode === "ytd"
      ? [`${today.slice(0, 4)}-01-01`, addDays(today, 1), `Year to date, ${today.slice(0, 4)}`]
      : [
          periodStart,
          addDays(periodStart, 14),
          `${formatDateLabel(periodStart)} – ${formatDateLabel(addDays(periodStart, 13))}`,
        ];

  const [employees, workTypes, billRates, jobs, wageRates, ptoAdjustments, ptoBalances, stats] =
    await Promise.all([
      fetchAllEmployees(),
      fetchAllWorkTypes(),
      fetchBillRates(),
      fetchAllJobs(),
      fetchWageRates(),
      fetchPtoAdjustments(),
      fetchPtoBalances(),
      fetchEmployeeStatistics(statsStart, statsEnd),
    ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Business Management</h1>
        <p className="text-sm text-gray-500">
          Manage work types, bill rates, wage rates, and PTO — the data that drives formulas
          elsewhere in the app.
        </p>
      </div>

      {error && <DismissibleBanner message={error} variant="error" />}
      {success && <DismissibleBanner message="Saved." variant="success" />}

      <div className="space-y-2">
        <h2 className="text-base font-bold text-gray-900">Work Types</h2>
        <form action={createWorkType} className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
                Enter Work Type Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Design"
                className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <SubmitButton
              pendingLabel="Adding…"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add work type
            </SubmitButton>
          </div>
        </form>

        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {workTypes.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                    No work types yet — employees can&rsquo;t log time until one exists.
                  </td>
                </tr>
              ) : (
                workTypes.map((wt) => <WorkTypeBlock key={wt.id} workType={wt} />)
              )}
            </tbody>
          </table>
        </div>
      </div>

      <BillRatesSection billRates={billRates} employees={employees} workTypes={workTypes} jobs={jobs} />

      <WageRatesPanel employees={employees} wageRates={wageRates} />

      <PtoPanel employees={employees} adjustments={ptoAdjustments} balances={ptoBalances} />

      <EmployeeStatisticsPanel
        stats={stats}
        mode={mode}
        periodStart={periodStart}
        rangeLabel={rangeLabel}
      />
    </div>
  );
}
