import { createClient } from "@/lib/supabase/server";
import type { BillRate } from "@/lib/types";

export async function fetchBillRates(): Promise<BillRate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bill_rates")
    .select("id, user_id, work_type_id, job_id, rate");

  if (error) {
    console.error("fetchBillRates failed:", error);
    return [];
  }

  return (data ?? []).map((row) => ({ ...row, rate: Number(row.rate) }));
}

// A job-specific override always wins over the employee's default rate for
// that work type; falls back to null if neither exists yet.
export function resolveBillRate(
  rates: BillRate[],
  userId: string,
  workTypeId: string,
  jobId: string | null
): number | null {
  if (jobId) {
    const override = rates.find(
      (r) => r.user_id === userId && r.work_type_id === workTypeId && r.job_id === jobId
    );
    if (override) return override.rate;
  }

  const defaultRate = rates.find(
    (r) => r.user_id === userId && r.work_type_id === workTypeId && r.job_id === null
  );
  return defaultRate ? defaultRate.rate : null;
}
