import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createJob } from "./actions";
import JobListTable from "./job-list-table";
import DismissibleBanner from "@/components/dismissible-banner";
import type { JobWithEntries } from "@/lib/types";

interface JobRow {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  notes: string | null;
}

interface EntryRow {
  id: string;
  entry_date: string;
  hours: number | string;
  notes: string | null;
  billed: boolean;
  job_id: string;
  profiles: { full_name: string | null; email: string | null } | null;
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;

  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (current.role !== "admin") redirect("/time-entries");

  const supabase = await createClient();

  const { data: jobsData, error: jobsError } = await supabase
    .from("jobs")
    .select("id, name, is_active, created_at, notes")
    .order("is_active", { ascending: false })
    .order("name", { ascending: true });

  if (jobsError) {
    console.error("Failed to load jobs:", jobsError);
  }

  const { data: entriesData, error: entriesError } = await supabase
    .from("time_entries")
    .select("id, entry_date, hours, notes, billed, job_id, profiles(full_name, email)")
    .order("entry_date", { ascending: true });

  if (entriesError) {
    console.error("Failed to load job entries:", entriesError);
  }

  const entryRows = (entriesData ?? []) as unknown as EntryRow[];
  const entriesByJob = new Map<string, JobWithEntries["entries"]>();
  for (const row of entryRows) {
    const list = entriesByJob.get(row.job_id) ?? [];
    list.push({
      id: row.id,
      entry_date: row.entry_date,
      hours: Number(row.hours),
      notes: row.notes,
      billed: row.billed,
      employee_name: row.profiles?.full_name || row.profiles?.email || "Unknown",
    });
    entriesByJob.set(row.job_id, list);
  }

  const jobRows = (jobsData ?? []) as JobRow[];
  const jobs: JobWithEntries[] = jobRows.map((job) => ({
    id: job.id,
    name: job.name,
    is_active: job.is_active,
    created_at: job.created_at,
    notes: job.notes,
    entries: entriesByJob.get(job.id) ?? [],
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Jobs</h1>
        <p className="text-sm text-gray-500">Add jobs, rename them, or mark them inactive.</p>
      </div>

      {error && <DismissibleBanner message={error} variant="error" />}
      {success && <DismissibleBanner message="Saved." variant="success" />}

      <div className="space-y-2">
        <h2 className="text-base font-bold text-gray-900">Add Job</h2>
        <form action={createJob} className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
                Enter Job Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="100001 KAIN - Modern Escape"
                className="w-96 rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add job
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-400">Must start with a 6-digit job number.</p>
        </form>
      </div>

      <div className="space-y-2">
        <h2 className="text-base font-bold text-gray-900">Job List</h2>
        <p className="text-xs text-gray-400">
          Click a job to see its entries. Bill Rate and Billable Amount are placeholders until the
          rate model is decided.
        </p>
        <JobListTable jobs={jobs} />
      </div>
    </div>
  );
}
