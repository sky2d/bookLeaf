"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

const CATEGORIES = [
  { value: "ROYALTY_PAYMENTS", label: "Royalty & Payments" },
  { value: "ISBN_METADATA", label: "ISBN & Metadata" },
  { value: "PRINTING_QUALITY", label: "Printing Quality" },
  { value: "DISTRIBUTION_AVAILABILITY", label: "Distribution & Availability" },
  { value: "BOOK_STATUS_PRODUCTION", label: "Production Status" },
  { value: "GENERAL_INQUIRY", label: "General Inquiry" },
];

export function QueueFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentStatus = searchParams.get("status") ?? "UNRESOLVED";
  const currentCategory = searchParams.get("category") ?? "";
  const currentPriority = searchParams.get("priority") ?? "";
  const currentAssignee = searchParams.get("assignee") ?? "";
  const currentFrom = searchParams.get("from") ?? "";
  const currentTo = searchParams.get("to") ?? "";
  const currentQ = searchParams.get("q") ?? "";

  const [prevQ, setPrevQ] = useState(currentQ);
  const [searchInput, setSearchInput] = useState(currentQ);

  if (prevQ !== currentQ) {
    setPrevQ(currentQ);
    setSearchInput(currentQ);
  }

  function updateParams(updates: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, val] of Object.entries(updates)) {
      if (val && val.trim() !== "") {
        // Special case: if status is default "UNRESOLVED", we can omit it from URL or set it
        if (key === "status" && val === "UNRESOLVED") {
          next.delete(key);
        } else {
          next.set(key, val);
        }
      } else {
        next.delete(key);
      }
    }
    // Always reset to page 1 on filter changes
    next.delete("page");

    startTransition(() => {
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  // Debounce search input typing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== currentQ) {
        updateParams({ q: searchInput });
      }
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const hasActiveFilters = Boolean(
    (currentStatus && currentStatus !== "UNRESOLVED") ||
      currentCategory ||
      currentPriority ||
      currentAssignee ||
      currentFrom ||
      currentTo ||
      currentQ,
  );

  function clearAllFilters() {
    setSearchInput("");
    startTransition(() => {
      router.replace(pathname);
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-rule bg-surface p-4 shadow-xs">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Search bar */}
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg
              className="size-4 text-ink-faint"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by ticket subject, description, author name/email, book..."
            className="w-full rounded-md border border-rule bg-paper/50 py-2 pr-9 pl-9 text-sm text-ink placeholder:text-ink-faint focus:border-cloth focus:bg-surface focus:outline-hidden"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                updateParams({ q: "" });
              }}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-faint hover:text-ink"
              aria-label="Clear search"
            >
              <span className="text-sm font-semibold">✕</span>
            </button>
          )}
        </div>

        {/* Clear filters shortcut */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="inline-flex items-center gap-1.5 self-start text-xs font-medium text-cloth hover:text-cloth-deep hover:underline lg:self-auto"
          >
            <span>✕ Clear all filters</span>
          </button>
        )}
      </div>

      {/* Filter Selects Row */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6 min-w-0">
        {/* Status */}
        <div className="min-w-0">
          <label htmlFor="filter-status" className="block text-[11px] font-medium tracking-wider text-ink-soft uppercase truncate">
            Status
          </label>
          <select
            id="filter-status"
            value={currentStatus}
            onChange={(e) => updateParams({ status: e.target.value })}
            className="mt-1 w-full rounded-md border border-rule bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-cloth focus:outline-hidden truncate"
          >
            <option value="UNRESOLVED">Active / Unresolved</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
            <option value="ALL">All Statuses</option>
          </select>
        </div>

        {/* Priority */}
        <div className="min-w-0">
          <label htmlFor="filter-priority" className="block text-[11px] font-medium tracking-wider text-ink-soft uppercase truncate">
            Priority
          </label>
          <select
            id="filter-priority"
            value={currentPriority}
            onChange={(e) => updateParams({ priority: e.target.value })}
            className="mt-1 w-full rounded-md border border-rule bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-cloth focus:outline-hidden truncate"
          >
            <option value="">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        {/* Category */}
        <div className="min-w-0">
          <label htmlFor="filter-category" className="block text-[11px] font-medium tracking-wider text-ink-soft uppercase truncate">
            Category
          </label>
          <select
            id="filter-category"
            value={currentCategory}
            onChange={(e) => updateParams({ category: e.target.value })}
            className="mt-1 w-full rounded-md border border-rule bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-cloth focus:outline-hidden truncate"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Assignee */}
        <div className="min-w-0">
          <label htmlFor="filter-assignee" className="block text-[11px] font-medium tracking-wider text-ink-soft uppercase truncate">
            Assignee
          </label>
          <select
            id="filter-assignee"
            value={currentAssignee}
            onChange={(e) => updateParams({ assignee: e.target.value })}
            className="mt-1 w-full rounded-md border border-rule bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-cloth focus:outline-hidden truncate"
          >
            <option value="">All Assignees</option>
            <option value="me">Assigned to me</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </div>

        {/* From Date */}
        <div className="min-w-0">
          <label htmlFor="filter-from" className="block text-[11px] font-medium tracking-wider text-ink-soft uppercase truncate">
            From
          </label>
          <input
            id="filter-from"
            type="date"
            value={currentFrom}
            onChange={(e) => updateParams({ from: e.target.value })}
            className="mt-1 w-full rounded-md border border-rule bg-surface px-2 py-1.5 text-xs text-ink focus:border-cloth focus:outline-hidden"
          >
          </input>
        </div>

        {/* To Date */}
        <div className="min-w-0">
          <label htmlFor="filter-to" className="block text-[11px] font-medium tracking-wider text-ink-soft uppercase truncate">
            To
          </label>
          <input
            id="filter-to"
            type="date"
            value={currentTo}
            onChange={(e) => updateParams({ to: e.target.value })}
            className="mt-1 w-full rounded-md border border-rule bg-surface px-2 py-1.5 text-xs text-ink focus:border-cloth focus:outline-hidden"
          >
          </input>
        </div>
      </div>

      {isPending && (
        <div className="flex items-center gap-2 text-xs text-ink-faint">
          <span className="size-2 animate-ping rounded-full bg-cloth" />
          <span>Updating queue filters...</span>
        </div>
      )}
    </div>
  );
}
