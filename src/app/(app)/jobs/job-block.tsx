"use client";

import { useEffect, useRef, useState } from "react";
import { updateJob, setJobActive } from "./actions";
import { formatDateLabel } from "@/lib/dates";
import type { JobWithEntries } from "@/lib/types";

export default function JobBlock({
  job,
  isExpanded,
  onToggleExpand,
  selected,
  onToggleEntry,
  onToggleJobEntries,
}: {
  job: JobWithEntries;
  isExpanded: boolean;
  onToggleExpand: () => void;
  selected: Set<string>;
  onToggleEntry: (id: string) => void;
  onToggleJobEntries: (entryIds: string[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const checkboxRef = useRef<HTMLInputElement>(null);

  const entryIds = job.entries.map((e) => e.id);
  const selectedCount = entryIds.filter((id) => selected.has(id)).length;
  const allSelected = entryIds.length > 0 && selectedCount === entryIds.length;
  const someSelected = selectedCount > 0 && !allSelected;

  useEffect(() => {
    if (checkboxRef.current) checkboxRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const totalHours = job.entries.reduce((sum, e) => sum + e.hours, 0);
  const billedCount = job.entries.filter((e) => e.billed).length;
  const billedLabel =
    job.entries.length === 0
      ? "—"
      : billedCount === job.entries.length
        ? "Yes"
        : billedCount === 0
          ? "No"
          : "Mixed";

  if (editing) {
    return (
      <tr className="border-b border-gray-100">
        <td colSpan={10} className="px-4 py-3">
          <form
            action={updateJob.bind(null, job.id)}
            className="flex flex-wrap items-end gap-3"
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Job</label>
              <input
                name="name"
                type="text"
                defaultValue={job.name}
                required
                autoFocus
                className="w-96 rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-[240px] flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
              <input
                name="notes"
                type="text"
                defaultValue={job.notes ?? ""}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <>
      <tr className="border-b border-gray-100 bg-gray-50/60 font-medium text-gray-900">
        <td className="px-3 py-2">
          <input
            ref={checkboxRef}
            type="checkbox"
            checked={allSelected}
            disabled={entryIds.length === 0}
            onChange={() => onToggleJobEntries(entryIds)}
            aria-label={`Select all entries for ${job.name}`}
          />
        </td>
        <td className="px-2 py-2 whitespace-nowrap">
          <button
            type="button"
            onClick={onToggleExpand}
            className="flex items-center gap-2 text-left hover:underline"
          >
            <span className="text-gray-400">{isExpanded ? "▾" : "▸"}</span>
            <span>{job.name}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                job.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
              }`}
            >
              {job.is_active ? "Active" : "Inactive"}
            </span>
          </button>
        </td>
        <td className="px-4 py-2">{billedLabel}</td>
        <td className="px-4 py-2 text-gray-400">—</td>
        <td className="px-4 py-2 text-right">{totalHours > 0 ? totalHours : "—"}</td>
        <td className="px-4 py-2 whitespace-nowrap">
          {formatDateLabel(job.created_at.slice(0, 10))}
        </td>
        <td className="px-4 py-2 text-gray-400">—</td>
        <td className="px-4 py-2 text-right text-gray-400">—</td>
        <td className="px-4 py-2 text-gray-600">{job.notes || "—"}</td>
        <td className="px-4 py-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Edit
            </button>
            <form action={setJobActive.bind(null, job.id, !job.is_active)}>
              <button
                type="submit"
                className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                {job.is_active ? "Deactivate" : "Activate"}
              </button>
            </form>
          </div>
        </td>
      </tr>

      {isExpanded &&
        job.entries.map((entry) => (
          <tr key={entry.id} className="border-b border-gray-50 text-sm text-gray-700">
            <td className="px-3 py-2">
              <input
                type="checkbox"
                checked={selected.has(entry.id)}
                onChange={() => onToggleEntry(entry.id)}
                aria-label={`Select entry from ${entry.entry_date}`}
              />
            </td>
            <td></td>
            <td className="px-4 py-2">{entry.billed ? "Yes" : "No"}</td>
            <td className="px-4 py-2">{entry.employee_name}</td>
            <td className="px-4 py-2 text-right">{entry.hours}</td>
            <td className="px-4 py-2 whitespace-nowrap">{formatDateLabel(entry.entry_date)}</td>
            <td className="px-4 py-2 text-gray-400">—</td>
            <td className="px-4 py-2 text-right text-gray-400">—</td>
            <td className="px-4 py-2">{entry.notes || "—"}</td>
            <td></td>
          </tr>
        ))}

      {isExpanded && job.entries.length > 0 && (
        <tr className="border-b border-gray-200 bg-gray-50 text-sm font-medium text-gray-900">
          <td></td>
          <td className="px-4 py-2">Total</td>
          <td></td>
          <td></td>
          <td className="px-4 py-2 text-right">{totalHours}</td>
          <td></td>
          <td></td>
          <td className="px-4 py-2 text-right text-gray-400">—</td>
          <td></td>
          <td></td>
        </tr>
      )}
    </>
  );
}
