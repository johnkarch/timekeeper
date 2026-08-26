"use client";

import { useState, useTransition } from "react";
import { bulkUpdateBilled } from "./actions";
import JobBlock from "./job-block";
import type { JobWithEntries } from "@/lib/types";

export default function JobListTable({ jobs }: { jobs: JobWithEntries[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const activeJobIds = jobs.filter((job) => job.is_active).map((job) => job.id);
  const allActiveExpanded =
    activeJobIds.length > 0 && activeJobIds.every((id) => expanded.has(id));

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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900">Job List</h2>
        <button
          type="button"
          onClick={toggleExpandAll}
          disabled={activeJobIds.length === 0}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {allActiveExpanded ? "Collapse all" : "Expand all"}
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 text-gray-500">
            <tr>
              <th className="px-3 py-2 font-medium"></th>
              <th className="px-2 py-2 font-medium">Job</th>
              <th className="px-4 py-2 font-medium">Billed</th>
              <th className="px-4 py-2 font-medium">Employee</th>
              <th className="px-4 py-2 text-right font-medium">Hours</th>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Bill Rate</th>
              <th className="px-4 py-2 text-right font-medium">Billable Amount</th>
              <th className="px-4 py-2 font-medium">Notes</th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-gray-500">
                  No jobs yet.
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
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
      </div>
    </div>
  );
}
