"use client";

import { useState } from "react";
import { updateTimeEntry, deleteTimeEntry } from "./actions";
import JobField from "./job-field";
import type { TimeEntryListItem } from "@/lib/types";

export default function EntryRow({ entry }: { entry: TimeEntryListItem }) {
  const [editing, setEditing] = useState(false);
  const canEdit = !entry.billed;

  if (editing) {
    return (
      <form
        action={updateTimeEntry.bind(null, entry.id)}
        className="grid gap-3 border-b border-gray-100 py-4 sm:grid-cols-2"
      >
        <JobField defaultValue={entry.job_name} />
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
          <input
            name="entry_date"
            type="date"
            required
            defaultValue={entry.entry_date}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Hours</label>
          <input
            name="hours"
            type="number"
            step="0.25"
            min="0.25"
            max="24"
            required
            defaultValue={entry.hours}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
          <input
            name="notes"
            type="text"
            defaultValue={entry.notes ?? ""}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2 sm:col-span-2">
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
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-3 text-sm">
      <div>
        <div className="font-medium text-gray-900">{entry.job_name}</div>
        <div className="text-gray-500">
          {entry.entry_date} · {entry.hours}h
          {entry.notes ? ` · ${entry.notes}` : ""}
          {entry.billed ? " · billed" : ""}
        </div>
      </div>
      {canEdit && (
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(true)}
            className="rounded-md border border-gray-300 px-2 py-1 text-gray-700 hover:bg-gray-50"
          >
            Edit
          </button>
          <form
            action={deleteTimeEntry.bind(null, entry.id)}
            onSubmit={(e) => {
              if (!confirm("Delete this time entry?")) e.preventDefault();
            }}
          >
            <button
              type="submit"
              className="rounded-md border border-red-200 px-2 py-1 text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
