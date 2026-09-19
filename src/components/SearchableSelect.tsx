"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  noResultsText?: string;
  disabled?: boolean;
}

/**
 * A searchable dropdown that's a drop-in replacement for a plain `<select>`
 * for large option lists (e.g. the ~195-country nationality picker) — the
 * caller keeps rendering its own `<label htmlFor>` and error message exactly
 * as it would around a native `<select>`; this component only replaces the
 * control itself. Built from scratch (no shadcn/ui or combobox library is
 * installed in this project) so it stays dependency-free.
 */
export function SearchableSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  noResultsText = "No results found",
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxId = `${id}-listbox`;

  const selectedOption = useMemo(() => options.find((option) => option.value === value), [options, value]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter(
      (option) => option.label.toLowerCase().includes(normalizedQuery) || option.value.toLowerCase().includes(normalizedQuery),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (open) searchInputRef.current?.focus();
  }, [open]);

  function openDropdown() {
    setHighlightedIndex(0);
    setOpen(true);
  }

  function closeDropdown() {
    setOpen(false);
    setQuery("");
  }

  function toggleDropdown() {
    if (open) closeDropdown();
    else openDropdown();
  }

  function handleSearchChange(nextQuery: string) {
    setQuery(nextQuery);
    setHighlightedIndex(0);
  }

  function selectOption(option: SearchableSelectOption) {
    onChange(option.value);
    closeDropdown();
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDropdown();
    }
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % Math.max(filteredOptions.length, 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + filteredOptions.length) % Math.max(filteredOptions.length, 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = filteredOptions[highlightedIndex];
      if (option) selectOption(option);
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeDropdown();
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={toggleDropdown}
        onKeyDown={handleTriggerKeyDown}
        className="w-full h-10 px-3 bg-surface-container-low text-candidate-text-heading rounded-lg text-body-md focus:outline-none focus:bg-surface-container-lowest focus:shadow-md transition-all flex items-center justify-between gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <span className={`truncate text-left ${selectedOption ? "" : "text-candidate-secondary"}`}>
          {selectedOption?.label ?? (value ? value : placeholder)}
        </span>
        <span className="material-symbols-outlined text-[18px] shrink-0" aria-hidden="true">
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-surface-container-lowest border border-surface-container-high rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-surface-container-high">
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={searchPlaceholder}
              role="searchbox"
              aria-label={searchPlaceholder}
              aria-controls={listboxId}
              aria-activedescendant={filteredOptions[highlightedIndex] ? `${id}-option-${highlightedIndex}` : undefined}
              className="w-full h-9 px-3 bg-surface-container-low text-candidate-text-heading rounded-lg text-body-md focus:outline-none"
            />
          </div>

          <ul id={listboxId} role="listbox" className="max-h-56 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-label-sm text-candidate-secondary">{noResultsText}</li>
            ) : (
              filteredOptions.map((option, index) => (
                <li
                  key={option.value}
                  id={`${id}-option-${index}`}
                  role="option"
                  aria-selected={option.value === value}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => selectOption(option)}
                  className={`px-3 py-2 text-body-md cursor-pointer ${
                    index === highlightedIndex ? "bg-surface-container text-candidate-text-heading" : "text-candidate-text-heading"
                  } ${option.value === value ? "font-semibold" : ""}`}
                >
                  {option.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
