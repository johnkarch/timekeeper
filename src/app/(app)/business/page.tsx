import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { addDays, formatDateLabel, payPeriodStart, todayISO } from "@/lib/dates";
import { fetchAllEmployees } from "@/lib/employees";
import { fetchBillRates } from "@/lib/bill-rates";
import { fetchWageRates } from "@/lib/wage-rates";
import { fetchPtoAdjustments, fetchPtoBalances } from "@/lib/pto";
import { fetchEmployeeStatistics } from "@/lib/employee-statistics";
import BillRatesSection from "./bill-rates-section";
import WageRatesPanel from "./wage-rates-panel";
import PtoPanel from "./pto-panel";
import EmployeeStatisticsPanel from "./employee-statistics-panel";
import DismissibleBanner from "@/components/dismissible-banner";

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

  const [employees, billRates, wageRates, ptoAdjustments, ptoBalances, stats] = await Promise.all([
    fetchAllEmployees(),
    fetchBillRates(),
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
          Manage bill rates, wage rates, and PTO — the data that drives formulas elsewhere in the
          app.
        </p>
      </div>

      {error && <DismissibleBanner message={error} variant="error" />}
      {success && <DismissibleBanner message="Saved." variant="success" />}

      <BillRatesSection billRates={billRates} employees={employees} />

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
