"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { updateTimeEntry, deleteTimeEntry } from "./actions";
import JobField from "./job-field";
import SubmitButton from "@/components/submit-button";
import type { TimeEntryListItem } from "@/lib/types";

const PANEL_WIDTH = 288; // matches w-72
const PANEL_HEIGHT_ESTIMATE = 380;
const VIEWPORT_MARGIN = 8;

export default function EntryTile({
  entry,
  weekParam,
  canEdit,
  highlight,
}: {
  entry: TimeEntryListItem;
  weekParam: string;
  canEdit: boolean;
  highlight: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [isSaving, startSaving] = useTransition();

  // The Save button below lives outside this form (submitted remotely via
  // its `form` attribute, so it can sit after the delete/cancel row) —
  // useFormStatus only tracks a form's own descendants, so it can't see
  // this button. Submitting manually through a transition instead lets us
  // disable the button for the same duration.
  function handleUpdateSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startSaving(async () => {
      await updateTimeEntry(entry.id, formData);
    });
  }

  function openPanel() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      let left = rect.right - PANEL_WIDTH;
      left = Math.max(VIEWPORT_MARGIN, Math.min(left, window.innerWidth - PANEL_WIDTH - VIEWPORT_MARGIN));

      const fitsBelow = rect.bottom + PANEL_HEIGHT_ESTIMATE + VIEWPORT_MARGIN <= window.innerHeight;
      const top = fitsBelow ? rect.bottom + 4 : Math.max(VIEWPORT_MARGIN, rect.top - PANEL_HEIGHT_ESTIMATE - 4);

      setPosition({ top, left });
    }
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    // Closing on scroll/resize is simpler and more reliable than re-tracking
    // the panel's position against a table that can scroll both ways.
    function handleScrollOrResize() {
      setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [open]);

  const tileClasses = `inline-flex w-28 min-h-14 flex-col justify-between rounded-md px-3 py-2 tabular-nums ${
    highlight ? "bg-blue-100 font-medium text-blue-900" : "bg-gray-100 text-gray-700"
  }`;

  const tileContent = (
    <>
      <span className="block w-full text-right text-sm">{entry.hours} hrs</span>
      {entry.notes && (
        <span className="mt-1 w-full text-left text-xs leading-snug font-normal text-current/80 line-clamp-2">
          {entry.notes}
        </span>
      )}
    </>
  );

  if (!canEdit) {
    return (
      <span
        className={`${tileClasses} cursor-not-allowed opacity-80`}
        title="Billed entries can't be edited here."
      >
        {tileContent}
      </span>
    );
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        title={entry.notes ?? undefined}
        className={`${tileClasses} cursor-pointer text-left hover:ring-2 hover:ring-blue-300`}
      >
        {tileContent}
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: position.top, left: position.left, width: PANEL_WIDTH }}
            className="z-50 space-y-3 rounded-lg border border-gray-200 bg-white p-3 text-left shadow-xl"
          >
            <form id={`update-form-${entry.id}`} onSubmit={handleUpdateSubmit} className="space-y-2">
              <input type="hidden" name="week" value={weekParam} />
              <JobField id={`job-${entry.id}`} defaultValue={entry.job_name} />
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Date</label>
                <input
                  name="entry_date"
                  type="date"
                  required
                  defaultValue={entry.entry_date}
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Hours</label>
                <input
                  name="hours"
                  type="number"
                  step="0.25"
                  min="0.25"
                  max="24"
                  required
                  defaultValue={entry.hours}
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Notes (optional)
                </label>
                <input
                  name="notes"
                  type="text"
                  defaultValue={entry.notes ?? ""}
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
                />
              </div>
            </form>

            <div className="flex gap-2 border-t border-gray-100 pt-3">
              <form
                action={deleteTimeEntry.bind(null, entry.id)}
                onSubmit={(e) => {
                  if (!confirm("Delete this entry? This can't be undone.")) e.preventDefault();
                }}
                className="flex-1"
              >
                <input type="hidden" name="week" value={weekParam} />
                <SubmitButton
                  pendingLabel="Deleting…"
                  className="w-full rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                >
                  Delete entry
                </SubmitButton>
              </form>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>

            <button
              form={`update-form-${entry.id}`}
              type="submit"
              disabled={isSaving}
              className="w-full rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Saving…" : "Save"}
            </button>
          </div>,
          document.body
        )}
    </>
  );
}
