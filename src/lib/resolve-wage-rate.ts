import type { WageRate } from "@/lib/types";

// Pure — kept out of wage-rates.ts (which imports the server-only Supabase
// client) so client components can resolve a rate without dragging that
// import into the browser bundle.
//
// The rate in effect on a given date is whichever row has the most recent
// effective_date that isn't after it — history further back stays visible
// but doesn't win over a more recent applicable rate.
export function resolveWageRate(rates: WageRate[], userId: string, asOf: string): number | null {
  const applicable = rates
    .filter((r) => r.user_id === userId && r.effective_date <= asOf)
    .sort((a, b) => b.effective_date.localeCompare(a.effective_date));

  return applicable.length > 0 ? applicable[0].hourly_rate : null;
}
