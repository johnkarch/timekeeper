"use client";

import { useState } from "react";
import { updateWorkType, setWorkTypeActive, deleteWorkType } from "./actions";
import SubmitButton from "@/components/submit-button";
import type { WorkType } from "@/lib/types";

export default function WorkTypeBlock({ workType }: { workType: WorkType }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <tr className="border-b border-gray-100">
        <td colSpan={3} className="px-4 py-3">
          <form
            action={updateWorkType.bind(null, workType.id)}
            className="flex flex-wrap items-end gap-3"
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
              <input
                name="name"
                type="text"
                defaultValue={workType.name}
                required
                autoFocus
                className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <SubmitButton
              pendingLabel="Saving…"
              className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              Save
            </SubmitButton>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </form>
          <form
            action={deleteWorkType.bind(null, workType.id)}
            onSubmit={(e) => {
              if (!confirm(`Delete "${workType.name}"? This can't be undone.`)) e.preventDefault();
            }}
            className="mt-2"
          >
            <SubmitButton
              pendingLabel="Deleting…"
              className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Delete work type
            </SubmitButton>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-gray-100">
      <td className="px-4 py-2 font-medium text-gray-900">{workType.name}</td>
      <td className="px-4 py-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            workType.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
          }`}
        >
          {workType.is_active ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Edit
          </button>
          <form action={setWorkTypeActive.bind(null, workType.id, !workType.is_active)}>
            <SubmitButton className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50">
              {workType.is_active ? "Deactivate" : "Activate"}
            </SubmitButton>
          </form>
        </div>
      </td>
    </tr>
  );
}
