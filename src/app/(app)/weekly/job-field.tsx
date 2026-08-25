"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { searchJobs } from "./actions";
import type { Job } from "@/lib/types";

export default function JobField({
  id = "job",
  defaultValue = "",
}: {
  id?: string;
  defaultValue?: string;
}) {
  const [text, setText] = useState(defaultValue);
  const [selected, setSelected] = useState<Job | null>(null);
  const [suggestions, setSuggestions] = useState<Job[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchedEmpty, setSearchedEmpty] = useState(false);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function runSearch(query: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const results = await searchJobs(query);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
        setSearchedEmpty(results.length === 0);
      });
    }, 150);
  }

  useEffect(() => {
    // On mount with a pre-filled value (edit mode), confirm it against the
    // database once so the field shows as selected without the user having
    // to re-search. Only want this on mount, not on every keystroke.
    if (defaultValue.trim()) {
      startTransition(async () => {
        const results = await searchJobs(defaultValue);
        const exact = results.find((job) => job.name.toLowerCase() === defaultValue.toLowerCase());
        if (exact) setSelected(exact);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(value: string) {
    setText(value);
    setSelected(null);
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchedEmpty(false);

    if (value.trim()) {
      runSearch(value);
    }
  }

  function selectSuggestion(job: Job) {
    setText(job.name);
    setSelected(job);
    setShowSuggestions(false);
    setSuggestions([]);
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
        Job
      </label>
      <input
        id={id}
        name="job"
        type="text"
        required
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setShowSuggestions(suggestions.length > 0)}
        onBlur={() => setShowSuggestions(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setShowSuggestions(false);
        }}
        placeholder="Type a job number or name…"
        autoComplete="off"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
      />
      {showSuggestions && (
        <ul className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white text-sm shadow-lg">
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
      <p className="mt-1 min-h-[1.25rem] text-sm">
        {isPending && <span className="text-gray-400">Searching…</span>}
        {!isPending && selected && !selected.is_active && (
          <span className="text-amber-600">This job is marked inactive.</span>
        )}
        {!isPending && selected && selected.is_active && (
          <span className="text-green-700">Selected.</span>
        )}
        {!isPending && !selected && searchedEmpty && text.trim() && (
          <span className="text-red-600">No matching jobs.</span>
        )}
      </p>
    </div>
  );
}
