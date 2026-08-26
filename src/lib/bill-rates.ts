import { createClient } from "@/lib/supabase/server";
import type { BillRate } from "@/lib/types";

export async function fetchBillRates(): Promise<BillRate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("bill_rates").select("id, user_id, rate");

  if (error) {
    console.error("fetchBillRates failed:", error);
    return [];
  }

  return (data ?? []).map((row) => ({ ...row, rate: Number(row.rate) }));
}

// Bill rate depends only on the employee — falls back to null if none is
// set yet.
export function resolveBillRate(rates: BillRate[], userId: string): number | null {
  const match = rates.find((r) => r.user_id === userId);
  return match ? match.rate : null;
}
