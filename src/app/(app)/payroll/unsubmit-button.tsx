"use client";

import { unsubmitWeek } from "./actions";

export default function UnsubmitButton({ submissionId }: { submissionId: string }) {
  return (
    <form
      action={unsubmitWeek.bind(null, submissionId)}
      onSubmit={(e) => {
        if (!confirm("Undo this submission? The employee will be able to edit this week again.")) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
      >
        Undo
      </button>
    </form>
  );
}
