"use client";

import { useMemo, useState, useTransition } from "react";
import { bulkSetJobActive, bulkUpdateBilled } from "./actions";
import JobBlock from "./job-block";
import type { JobWithEntries } from "@/lib/types";

type SortOption = "num-asc" | "num-desc" | "activity-desc" | "activity-asc";

const SORT_LABELS: Record<SortOption, string> = {
  "num-asc": "Job number (ascending)",
  "num-desc": "Job number (descending)",
  "activity-desc": "Most recent activity",
  "activity-asc": "Least recent activity",
};

// The leading 6 digits are guaranteed by isValidJobName — see job-format.ts.
function jobNumber(name: string): number {
  return parseInt(name.slice(0, 6), 10);
}

// The most recent date anything was logged against a job, falling back to
// when the job itself was created if nothing's been logged yet.
function lastActivity(job: JobWithEntries): string {
  if (job.entries.length === 0) return job.created_at.slice(0, 10);
  return job.entries.reduce((latest, e) => (e.entry_date > latest ? e.entry_date : latest), "");
}

function compareBySortOption(a: JobWithEntries, b: JobWithEntries, sortBy: SortOption): number {
  switch (sortBy) {
    case "num-asc":
      return jobNumber(a.name) - jobNumber(b.name);
    case "num-desc":
      return jobNumber(b.name) - jobNumber(a.name);
    case "activity-desc":
      return lastActivity(b).localeCompare(lastActivity(a));
    case "activity-asc":
      return lastActivity(a).localeCompare(lastActivity(b));
  }
}

// Active jobs always come before inactive ones, regardless of the chosen
// sort — the sort option only decides the order within each group.
function sortJobs(jobs: JobWithEntries[], sortBy: SortOption): JobWithEntries[] {
  return [...jobs].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    return compareBySortOption(a, b, sortBy);
  });
}

export default function JobListTable({ jobs }: { jobs: JobWithEntries[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [sortBy, setSortBy] = useState<SortOption>("num-asc");
  const [showInactive, setShowInactive] = useState(false);

  const visibleJobs = useMemo(
    () => (showInactive ? jobs : jobs.filter((job) => job.is_active)),
    [jobs, showInactive]
  );
  const sortedJobs = useMemo(() => sortJobs(visibleJobs, sortBy), [visibleJobs, sortBy]);

  const activeJobIds = jobs.filter((job) => job.is_active).map((job) => job.id);
  const allActiveExpanded =
    activeJobIds.length > 0 && activeJobIds.every((id) => expanded.has(id));

  // A job counts as "selected" for Activate/Deactivate once every one of its
  // entries is checked via its row's own checkbox — there's no separate
  // job-level checkbox. A job with no entries can never be selected this
  // way, since its checkbox has nothing to check and stays disabled.
  const selectedJobIds = jobs
    .filter((job) => {
      const entryIds = job.entries.map((e) => e.id);
      return entryIds.length > 0 && entryIds.every((id) => selected.has(id));
    })
    .map((job) => job.id);

  function toggleExpand(jobId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  }

  function toggleExpandAll() {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (allActiveExpanded) {
        activeJobIds.forEach((id) => next.delete(id));
      } else {
        activeJobIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  function toggleEntry(entryId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  }

  function toggleJobEntries(entryIds: string[]) {
    const allSelected = entryIds.length > 0 && entryIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of entryIds) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  function handleBulk(intent: "bill" | "unbill") {
    const formData = new FormData();
    selected.forEach((id) => formData.append("entryIds", id));
    formData.set("intent", intent);
    startTransition(async () => {
      await bulkUpdateBilled(formData);
    });
  }

  function handleBulkActive(intent: "activate" | "deactivate") {
    const formData = new FormData();
    selectedJobIds.forEach((id) => formData.append("jobIds", id));
    formData.set("intent", intent);
    startTransition(async () => {
      await bulkSetJobActive(formData);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900">Job List</h2>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-500">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Show inactive jobs
          </label>
          <label htmlFor="job-sort" className="text-sm text-gray-500">
            Sort by
          </label>
          <select
            id="job-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
              <option key={option} value={option}>
                {SORT_LABELS[option]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={toggleExpandAll}
            disabled={activeJobIds.length === 0}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {allActiveExpanded ? "Collapse all" : "Expand all"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full table-fixed text-left text-sm">
          <colgroup>
            <col className="w-10" />
            <col className="w-56" />
            <col className="w-[70px]" />
            <col className="w-32" />
            <col className="w-[70px]" />
            <col className="w-28" />
            <col className="w-[70px]" />
            <col className="w-28" />
            <col className="w-48" />
            <col className="w-[90px]" />
          </colgroup>
          <thead className="border-b border-gray-200 bg-[#3d8f86] text-white">
            <tr>
              <th className="px-3 py-2 font-medium"></th>
              <th className="px-2 py-2 font-medium">Job</th>
              <th className="px-4 py-2 font-medium">Billed</th>
              <th className="px-4 py-2 font-medium">Employee</th>
              <th className="px-4 py-2 text-right font-medium">Hours</th>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-2 py-2 font-medium">Bill Rate</th>
              <th className="px-4 py-2 text-right font-medium">Billable Amount</th>
              <th className="px-4 py-2 font-medium">Notes</th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedJobs.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-gray-500">
                  {jobs.length === 0
                    ? "No jobs yet."
                    : "No active jobs. Check “Show inactive jobs” to see them."}
                </td>
              </tr>
            ) : (
              sortedJobs.map((job) => (
                <JobBlock
                  key={job.id}
                  job={job}
                  isExpanded={expanded.has(job.id)}
                  onToggleExpand={() => toggleExpand(job.id)}
                  selected={selected}
                  onToggleEntry={toggleEntry}
                  onToggleJobEntries={toggleJobEntries}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">{selected.size} selected</span>
        <button
          type="button"
          disabled={selected.size === 0 || isPending}
          onClick={() => handleBulk("bill")}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Mark billed
        </button>
        <button
          type="button"
          disabled={selected.size === 0 || isPending}
          onClick={() => handleBulk("unbill")}
          className="rounded-md border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Mark unbilled
        </button>
        <button
          type="button"
          disabled={selectedJobIds.length === 0 || isPending}
          onClick={() => handleBulkActive("activate")}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Activate
        </button>
        <button
          type="button"
          disabled={selectedJobIds.length === 0 || isPending}
          onClick={() => handleBulkActive("deactivate")}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Deactivate
        </button>
      </div>
    </div>
  );
}
