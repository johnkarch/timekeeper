import { createClient } from "@/lib/supabase/server";
import type { BillRate } from "@/lib/types";

export async function fetchBillRates(): Promise<BillRate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bill_rates")
    .select("id, user_id, rate, effective_date")
    .order("effective_date", { ascending: false });

  if (error) {
    console.error("fetchBillRates failed:", error);
    return [];
  }

  return (data ?? []).map((row) => ({ ...row, rate: Number(row.rate) }));
}
