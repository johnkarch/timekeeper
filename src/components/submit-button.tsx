"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

// A plain `<button type="submit">` stays clickable while a Server Action is
// still in flight, so a second click before the page re-renders fires a
// second submission (e.g. a duplicate time entry). useFormStatus reports
// this specific form's in-flight state, so wrapping every submit button in
// this component disables it for the duration of the request. Must be
// rendered as a descendant of the <form> it belongs to — it won't work for
// a button outside the form linked only via the HTML `form="id"` attribute
// (see src/app/(app)/weekly/entry-tile.tsx for that case, handled locally).
export default function SubmitButton({
  children,
  pendingLabel,
  className = "",
}: {
  children: ReactNode;
  pendingLabel?: ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {pending ? (pendingLabel ?? children) : children}
    </button>
  );
}
