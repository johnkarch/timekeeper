"use client";

import { submitWeek } from "./actions";

export default function SubmitWeekButton({ weekParam }: { weekParam: string }) {
  return (
    <form
      action={submitWeek}
      onSubmit={(e) => {
        if (
          !confirm(
            "Submit this week? You won't be able to add, edit, or delete entries for this week afterward — only an admin can undo this."
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="week" value={weekParam} />
      <button
        type="submit"
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Submit
      </button>
    </form>
  );
}
