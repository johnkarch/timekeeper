import { createClient } from "@/lib/supabase/server";
import type { WageRate } from "@/lib/types";

export async function fetchWageRates(): Promise<WageRate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wage_rates")
    .select("id, user_id, hourly_rate, effective_date")
    .order("effective_date", { ascending: false });

  if (error) {
    console.error("fetchWageRates failed:", error);
    return [];
  }

  return (data ?? []).map((row) => ({ ...row, hourly_rate: Number(row.hourly_rate) }));
}
