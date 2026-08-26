import { createClient } from "@/lib/supabase/server";
import { fetchMonthlyEntries } from "@/lib/monthly-entries";
import type { PtoAdjustment } from "@/lib/types";

// No agreed-upon job for this exists yet — matches any job whose name
// mentions PTO, vacation, or a holiday, case-insensitively. Update this if
// a specific job number/name is settled on later. Shared by the Payroll
// page's hour breakdown and the Business Management PTO balance, so both
// agree on what counts as PTO.
export const PTO_JOB_PATTERN = /pto|vacation|holiday/i;

// Wide enough to catch every entry ever logged — there's no "fetch
// everything" variant of fetchMonthlyEntries, so a date range comfortably
// outside the app's real usage window stands in for "all time."
const ALL_TIME_START = "2000-01-01";
const ALL_TIME_END = "2100-01-01";

export async function fetchPtoAdjustments(): Promise<PtoAdjustment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pto_adjustments")
    .select("id, user_id, hours, reason, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchPtoAdjustments failed:", error);
    return [];
  }

  return (data ?? []).map((row) => ({ ...row, hours: Number(row.hours) }));
}

// Current PTO balance per employee: everything granted/corrected via the
// ledger, minus every PTO hour ever actually logged.
export async function fetchPtoBalances(): Promise<Map<string, number>> {
  const [adjustments, entries] = await Promise.all([
    fetchPtoAdjustments(),
    fetchMonthlyEntries({ start: ALL_TIME_START, end: ALL_TIME_END }),
  ]);

  const balances = new Map<string, number>();
  for (const adjustment of adjustments) {
    balances.set(adjustment.user_id, (balances.get(adjustment.user_id) ?? 0) + adjustment.hours);
  }
  for (const entry of entries) {
    if (PTO_JOB_PATTERN.test(entry.job_name)) {
      balances.set(entry.user_id, (balances.get(entry.user_id) ?? 0) - entry.hours);
    }
  }
  return balances;
}
