"use client";

import { useState } from "react";
import { updateJobName, setJobActive } from "./actions";
import type { Job } from "@/lib/types";

export default function JobRow({ job }: { job: Job }) {
  const [editing, setEditing] = useState(false);

  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="px-4 py-2">
        {editing ? (
          <form action={updateJobName.bind(null, job.id)} className="flex items-center gap-2">
            <input
              name="name"
              type="text"
              defaultValue={job.name}
              required
              autoFocus
              className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
            />
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white hover:bg-gray-800"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </form>
        ) : (
          job.name
        )}
      </td>
      <td className="px-4 py-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            job.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
          }`}
        >
          {job.is_active ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-2">
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Edit
            </button>
          )}
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
  );
}
