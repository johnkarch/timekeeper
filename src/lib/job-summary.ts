import type { MonthlyEntry } from "@/lib/monthly-entries";

export interface JobSummary {
  job_name: string;
  hours: number;
}

// Powers the Reports page's "Summary" report — total hours per job across
// whatever entries the caller already fetched (date range / billed status /
// employee / job filters are all applied upstream by fetchMonthlyEntries).
export function summarizeByJob(entries: MonthlyEntry[]): JobSummary[] {
  const byJob = new Map<string, number>();
  for (const entry of entries) {
    byJob.set(entry.job_name, (byJob.get(entry.job_name) ?? 0) + entry.hours);
  }

  return Array.from(byJob.entries())
    .map(([job_name, hours]) => ({ job_name, hours }))
    .sort((a, b) => a.job_name.localeCompare(b.job_name));
}
