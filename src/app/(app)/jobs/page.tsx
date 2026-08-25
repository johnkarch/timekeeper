import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createJob } from "./actions";
import JobRow from "./job-row";
import type { Job } from "@/lib/types";

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
  const { data, error: fetchError } = await supabase
    .from("jobs")
    .select("id, name, is_active")
    .order("name", { ascending: true });

  if (fetchError) {
    console.error("Failed to load jobs:", fetchError);
  }

  const jobs = (data ?? []) as Job[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Jobs</h1>
        <p className="text-sm text-gray-500">Add jobs, rename them, or mark them inactive.</p>
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Saved.</p>}

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
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Job</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                    No jobs yet.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => <JobRow key={job.id} job={job} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
