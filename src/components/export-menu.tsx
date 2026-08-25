"use client";

import { useEffect, useRef, useState } from "react";

const DEFAULT_FORMATS: { format: string; label: string }[] = [
  { format: "csv", label: "CSV" },
  { format: "xlsx", label: "Excel (.xlsx)" },
  { format: "pdf", label: "PDF" },
];

// A plain link would remember nothing about which format was picked last —
// that's intentional, the user re-chooses every time.
export default function ExportMenu({
  basePath,
  params,
  formats = DEFAULT_FORMATS,
}: {
  basePath: string;
  params: Record<string, string>;
  formats?: { format: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function urlFor(format: string) {
    const searchParams = new URLSearchParams(params);
    searchParams.set("format", format);
    return `${basePath}?${searchParams.toString()}`;
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-md border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
      >
        Export ▾
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-md border border-gray-200 bg-white p-1 shadow-lg">
          {formats.map(({ format, label }) => (
            <a
              key={format}
              href={urlFor(format)}
              onClick={() => setOpen(false)}
              className="block rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
