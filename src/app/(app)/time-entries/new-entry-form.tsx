"use client";

import { createTimeEntry } from "./actions";
import JobField from "./job-field";
import { todayISO } from "@/lib/dates";

export default function NewEntryForm({ weekParam }: { weekParam: string }) {
  return (
    <form
      action={createTimeEntry}
      className="grid gap-4 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2"
    >
      <input type="hidden" name="week" value={weekParam} />
      <JobField />
      <div>
        <label htmlFor="entry_date" className="mb-1 block text-sm font-medium text-gray-700">
          Date
        </label>
        <input
          id="entry_date"
          name="entry_date"
          type="date"
          required
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
      <div className="sm:col-span-2">
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add entry
        </button>
      </div>
    </form>
  );
}
