"use client";

import { useTransition } from "react";
import { unsubmitWeek } from "./actions";

// There's only one direction this toggle actually moves in practice: once
// switched off (unlocked), the submission row is gone, so this row
// disappears from the list entirely rather than the toggle flipping back.
export default function UnlockToggle({ submissionId }: { submissionId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    if (!confirm("Unlock this week? The employee will be able to edit it again.")) return;
    startTransition(async () => {
      await unsubmitWeek(submissionId);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked="true"
        disabled={isPending}
        onClick={handleToggle}
        className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-blue-600 transition-colors disabled:opacity-50"
      >
        <span className="inline-block h-4 w-4 translate-x-6 transform rounded-full bg-white transition-transform" />
      </button>
      <span className="text-sm text-gray-700">
        {isPending ? "Unlocking…" : "Locked — toggle to unlock this week"}
      </span>
    </div>
  );
}
