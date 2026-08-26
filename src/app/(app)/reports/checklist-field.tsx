"use client";

import { useRef, useState } from "react";

export interface ChecklistOption {
  id: string;
  label: string;
}

export default function ChecklistField({
  name,
  heading,
  options,
  selectedIds,
}: {
  name: string;
  heading: string;
  options: ChecklistOption[];
  // null = no filter param was present in the URL, so everything starts
  // checked (the "no filter applied" default). A Set means only those ids
  // should start checked, reflecting filters already applied.
  selectedIds: Set<string> | null;
}) {
  const [filterText, setFilterText] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  function setAll(checked: boolean) {
    const boxes = containerRef.current?.querySelectorAll<HTMLInputElement>(
      `input[name="${name}"]`
    );
    boxes?.forEach((box) => {
      box.checked = checked;
    });
  }

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div ref={containerRef} className="w-56">
      <div className="mb-1 flex items-center justify-between">
        <span className="block text-sm font-medium text-gray-700">{heading}</span>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setAll(true)}
            className="text-blue-600 hover:underline"
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setAll(false)}
            className="text-blue-600 hover:underline"
          >
            None
          </button>
        </div>
      </div>
      {options.length > 6 && (
        <input
          type="text"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder="Filter…"
          className="mb-1 w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
        />
      )}
      <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-gray-300 p-2">
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-400">No matches.</p>
        ) : (
          filtered.map((option) => (
            <label key={option.id} className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name={name}
                value={option.id}
                defaultChecked={selectedIds === null || selectedIds.has(option.id)}
              />
              {option.label}
            </label>
          ))
        )}
      </div>
    </div>
  );
}
