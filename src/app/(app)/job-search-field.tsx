"use client";

import { useRef, useState, useTransition } from "react";
import { searchJobs } from "@/app/(app)/time-entries/actions";
import type { Job } from "@/lib/types";

// Used to filter a list of entries by job (Weekly, Monthly) rather than to
// attach a specific job to a time entry — so unlike JobField, there's no
// "selected" confirmation state. Picking a suggestion just fills in the
// exact text; typing freely and not picking one still works the same way
// it always has (a plain contains-search once the filter form is applied).
export default function JobSearchField({ defaultValue = "" }: { defaultValue?: string }) {
  const [text, setText] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<Job[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function runSearch(query: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const results = await searchJobs(query);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      });
    }, 150);
  }

  function handleChange(value: string) {
    setText(value);
    setSuggestions([]);
    setShowSuggestions(false);
    if (value.trim()) runSearch(value);
  }

  function selectSuggestion(job: Job) {
    setText(job.name);
    setShowSuggestions(false);
    setSuggestions([]);
  }

  return (
    <div className="relative">
      <label htmlFor="q" className="mb-1 block text-sm font-medium text-gray-700">
        Job
      </label>
      <input
        id="q"
        name="q"
        type="text"
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setShowSuggestions(suggestions.length > 0)}
        onBlur={() => setShowSuggestions(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setShowSuggestions(false);
        }}
        placeholder="Search jobs…"
        autoComplete="off"
        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      {showSuggestions && (
        <ul className="absolute z-10 mt-1 w-64 rounded-md border border-gray-200 bg-white text-sm shadow-lg">
          {suggestions.map((job) => (
            <li key={job.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  // Fires before the input's onBlur, so the dropdown is
                  // still mounted when the click lands.
                  e.preventDefault();
                  selectSuggestion(job);
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50"
              >
                <span>{job.name}</span>
                {!job.is_active && <span className="ml-2 text-gray-400">(inactive)</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {isPending && <p className="mt-1 text-xs text-gray-400">Searching…</p>}
    </div>
  );
}
