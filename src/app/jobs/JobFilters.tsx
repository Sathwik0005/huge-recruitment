"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const EMPLOYMENT_TYPES = [
  { value: "PERMANENT", label: "Permanent" },
  { value: "TEMPORARY", label: "Temporary" },
  { value: "TEMP_TO_PERM", label: "Temp to Perm" },
  { value: "FIXED_TERM", label: "Fixed Term" },
  { value: "CONTRACT", label: "Contract" },
] as const;

const SHIFT_CATEGORIES = ["DAY", "NIGHT", "ROTATING", "WEEKEND", "FLEXIBLE", "OTHER"] as const;
const PAY_PERIODS = ["HOUR", "DAY", "WEEK", "MONTH", "YEAR"] as const;

type SectorOption = { name: string; label: string };

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function JobFilters({ sectors, children }: { sectors: SectorOption[]; children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [keyword, setKeyword] = useState(searchParams.get("keyword") ?? "");
  const [location, setLocation] = useState(searchParams.get("location") ?? "");
  const [sector, setSector] = useState<string[]>(searchParams.get("sector")?.split(",").filter(Boolean) ?? []);
  const [employmentType, setEmploymentType] = useState<string[]>(
    searchParams.get("employmentType")?.split(",").filter(Boolean) ?? []
  );
  const [shift, setShift] = useState<string[]>(searchParams.get("shift")?.split(",").filter(Boolean) ?? []);
  const [payPeriod, setPayPeriod] = useState(searchParams.get("payPeriod") ?? "");
  const [minimumPay, setMinimumPay] = useState(searchParams.get("minimumPay") ?? "");
  const [sort, setSort] = useState(searchParams.get("sort") ?? "newest");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isFirstRender = useRef(true);

  function pushParams(overrides: Record<string, string | string[] | undefined>) {
    const next = new URLSearchParams(searchParams.toString());
    const merged = {
      keyword,
      location,
      sector: sector.join(","),
      employmentType: employmentType.join(","),
      shift: shift.join(","),
      payPeriod,
      minimumPay,
      sort,
      ...overrides,
    };
    for (const [key, value] of Object.entries(merged)) {
      const stringValue = Array.isArray(value) ? value.join(",") : value;
      if (stringValue) next.set(key, stringValue);
      else next.delete(key);
    }
    next.delete("page");
    router.push(`/jobs?${next.toString()}`);
  }

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushParams({ keyword, location }), 400);
    return () => clearTimeout(debounceRef.current);
    // pushParams intentionally omitted: it closes over every filter field
    // (not just keyword/location) and is only meant to fire on this debounce
    // timer, not on every other filter's own change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, location]);

  const activeFilterCount =
    sector.length + employmentType.length + shift.length + (payPeriod ? 1 : 0) + (minimumPay ? 1 : 0);

  function clearFilters() {
    setKeyword("");
    setLocation("");
    setSector([]);
    setEmploymentType([]);
    setShift([]);
    setPayPeriod("");
    setMinimumPay("");
    setSort("newest");
    router.push("/jobs");
  }

  return (
    <>
      <section aria-label="Search jobs" className="mb-6 rounded-lg  p-4  md:p-5">
        <div className="mx-auto flex max-w-2xl flex-col gap-3 md:flex-row md:items-center">
          <label className="relative block flex-1">
            <span className="sr-only">Search by job title or keyword</span>
            <span aria-hidden="true" className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
              search
            </span>
            <input
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Job title or keyword"
              className="h-12 w-full rounded-lg border border-outline-variant bg-white pl-11 pr-4 text-body-md text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <label className="relative block flex-1">
            <span className="sr-only">Search by town, city or postcode</span>
            <span aria-hidden="true" className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
              location_on
            </span>
            <input
              type="search"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Town, city or postcode"
              className="h-12 w-full rounded-lg border border-outline-variant bg-white pl-11 pr-4 text-body-md text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="flex h-12 items-center justify-center gap-2 rounded-lg border border-primary px-5 font-semibold text-primary transition hover:bg-primary hover:text-on-primary lg:hidden"
          >
            <span aria-hidden="true" className="material-symbols-outlined">
              tune
            </span>
            Filters
            {activeFilterCount > 0 && (
              <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs text-on-primary">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      {filtersOpen && (
        <button
          type="button"
          aria-label="Close filters"
          onClick={() => setFiltersOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        aria-label="Job filters"
        className={`${
          filtersOpen
            ? "fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-2xl"
            : "hidden"
        } border border-outline-variant bg-surface-container-lowest shadow-lg lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:rounded-lg lg:shadow-sm filters-scrollbar`}
        style={{ scrollbarWidth: "thin", scrollbarColor: "var(--color-secondary-container) transparent" }}
      >
        <div className="flex items-center justify-between border-b border-outline-variant p-5">
          <div>
            <h2 className="font-headline-md text-headline-md text-primary">Filter &amp; sort</h2>
            {activeFilterCount > 0 && <p className="text-label-sm text-on-surface-variant">{activeFilterCount} applied</p>}
          </div>
          <button type="button" onClick={() => setFiltersOpen(false)} className="flex size-11 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container lg:hidden">
            <span className="sr-only">Close filters</span>
            <span aria-hidden="true" className="material-symbols-outlined">
              close
            </span>
          </button>
        </div>

        <div className="divide-y divide-outline-variant">
          <div className="space-y-1 p-5">
            <label className="mb-1.5 block text-label-md font-bold uppercase tracking-wider text-primary" htmlFor="sort">
              Sort by
            </label>
            <select
              id="sort"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                pushParams({ sort: e.target.value });
              }}
              className="h-11 w-full rounded-lg border border-outline-variant bg-surface px-3 font-medium text-primary"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              {payPeriod && (
                <>
                  <option value="pay-asc">Pay: low to high</option>
                  <option value="pay-desc">Pay: high to low</option>
                </>
              )}
            </select>
          </div>

          <fieldset className="p-5">
            <legend className="mb-3 text-label-md font-bold uppercase tracking-wider text-primary">Sector</legend>
            <div className="space-y-3">
              {sectors.map((s) => (
                <label key={s.name} className="flex min-h-8 cursor-pointer items-center gap-3 text-on-surface-variant hover:text-primary">
                  <input
                    type="checkbox"
                    checked={sector.includes(s.name)}
                    onChange={() => {
                      const next = toggle(sector, s.name);
                      setSector(next);
                      pushParams({ sector: next });
                    }}
                    className="size-5 rounded border-outline-variant text-primary"
                  />
                  <span>{s.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="p-5">
            <legend className="mb-3 text-label-md font-bold uppercase tracking-wider text-primary">Employment type</legend>
            <div className="space-y-3">
              {EMPLOYMENT_TYPES.map((type) => (
                <label key={type.value} className="flex min-h-8 cursor-pointer items-center gap-3 text-on-surface-variant hover:text-primary">
                  <input
                    type="checkbox"
                    checked={employmentType.includes(type.value)}
                    onChange={() => {
                      const next = toggle(employmentType, type.value);
                      setEmploymentType(next);
                      pushParams({ employmentType: next });
                    }}
                    className="size-5 rounded border-outline-variant text-primary"
                  />
                  <span>{type.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="p-5">
            <legend className="mb-3 text-label-md font-bold uppercase tracking-wider text-primary">Shift</legend>
            <div className="flex flex-wrap gap-2">
              {SHIFT_CATEGORIES.map((category) => {
                const selected = shift.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      const next = toggle(shift, category);
                      setShift(next);
                      pushParams({ shift: next });
                    }}
                    className={
                      selected
                        ? "h-10 rounded-full border border-primary bg-primary px-4 text-sm font-semibold text-on-primary"
                        : "h-10 rounded-full border border-outline-variant px-4 text-sm text-on-surface-variant hover:border-primary hover:text-primary"
                    }
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="space-y-4 p-5">
            <h3 className="text-label-md font-bold uppercase tracking-wider text-primary">Pay</h3>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-on-surface" htmlFor="payPeriod">
                Pay period
              </label>
              <select
                id="payPeriod"
                value={payPeriod}
                onChange={(e) => {
                  setPayPeriod(e.target.value);
                  const nextMinimum = e.target.value ? minimumPay : "";
                  const nextSort = e.target.value ? sort : sort === "pay-asc" || sort === "pay-desc" ? "newest" : sort;
                  if (!e.target.value) {
                    setMinimumPay("");
                    setSort(nextSort);
                  }
                  pushParams({ payPeriod: e.target.value, minimumPay: nextMinimum, sort: nextSort });
                }}
                className="h-11 w-full rounded-lg border border-outline-variant bg-surface px-3 text-on-surface"
              >
                <option value="">Any pay period</option>
                {PAY_PERIODS.map((period) => (
                  <option key={period} value={period}>
                    Per {period.toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-on-surface" htmlFor="minimumPay">
                Minimum pay
              </label>
              <div className="relative">
                <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                  £
                </span>
                <input
                  id="minimumPay"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  disabled={!payPeriod}
                  value={minimumPay}
                  onChange={(e) => setMinimumPay(e.target.value)}
                  onBlur={() => pushParams({ minimumPay })}
                  placeholder={payPeriod ? "Enter amount" : "Choose pay period first"}
                  className="h-11 w-full rounded-lg border border-outline-variant bg-surface pl-8 pr-3 text-on-surface disabled:cursor-not-allowed disabled:bg-surface-container disabled:text-outline"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex gap-3 border-t border-outline-variant bg-surface-container-lowest p-5">
          <button type="button" onClick={clearFilters} className="h-11 flex-1 rounded-lg border border-outline-variant px-4 font-semibold text-on-surface-variant hover:border-primary hover:text-primary">
            Clear all
          </button>
          <button type="button" onClick={() => setFiltersOpen(false)} className="h-11 flex-1 rounded-lg bg-primary px-4 font-semibold text-on-primary lg:hidden">
            Apply filters
          </button>
        </div>
      </aside>

      {children}
      </div>
    </>
  );
}
