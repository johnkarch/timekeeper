"use client";

import { useState } from "react";
import { createTimeEntry } from "./actions";
import JobField from "./job-field";
import { todayISO } from "@/lib/dates";
import SubmitButton from "@/components/submit-button";
import type { WorkType } from "@/lib/types";

export default function NewEntryForm({
  weekParam,
  workTypes,
}: {
  weekParam: string;
  workTypes: WorkType[];
}) {
  const [expanded, setExpanded] = useState(false);

  if (workTypes.length === 0) {
    return (
      <p className="text-sm text-amber-600">
        Ask your admin to add a work type before logging time.
      </p>
    );
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        + Add Entry
      </button>
    );
  }

  return (
    <form
      action={createTimeEntry}
      className="grid gap-4 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2"
    >
      <input type="hidden" name="week" value={weekParam} />
      <JobField />
      <div>
        <label htmlFor="work_type_id" className="mb-1 block text-sm font-medium text-gray-700">
          Work Type
        </label>
        <select
          id="work_type_id"
          name="work_type_id"
          required
          defaultValue=""
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        >
          <option value="" disabled>
            Choose…
          </option>
          {workTypes.map((workType) => (
            <option key={workType.id} value={workType.id}>
              {workType.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="entry_date" className="mb-1 block text-sm font-medium text-gray-700">
          Date
        </label>
        <input
          id="entry_date"
          name="entry_date"
          type="date"
          required
          autoFocus
          defaultValue={todayISO()}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="hours" className="mb-1 block text-sm font-medium text-gray-700">
          Hours
        </label>
        <input
          id="hours"
          name="hours"
          type="number"
          step="0.25"
          min="0.25"
          max="24"
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium text-gray-700">
          Notes (optional)
        </label>
        <input
          id="notes"
          name="notes"
          type="text"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <SubmitButton
          pendingLabel="Saving…"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Save
        </SubmitButton>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
