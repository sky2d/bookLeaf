"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PriorityBadge } from "@/components/PriorityBadge";
import { SourceChip } from "@/components/SourceChip";
import { StatusBadge } from "@/components/StatusBadge";
import { formatAge } from "@/lib/format";
import type { AdminTicketDto, AdminTicketQueueResponse } from "@/shared/dto";

const CATEGORY_LABELS: Record<string, string> = {
  ROYALTY_PAYMENTS: "Royalty & Payments",
  ISBN_METADATA: "ISBN & Metadata",
  PRINTING_QUALITY: "Printing Quality",
  DISTRIBUTION_AVAILABILITY: "Distribution",
  BOOK_STATUS_PRODUCTION: "Production",
  GENERAL_INQUIRY: "General",
};

const OVERDUE_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 hours

type ViewMode = "auto" | "table" | "cards";

export function AdminTicketQueue() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [now] = useState(() => Date.now());
  const [viewMode, setViewMode] = useState<ViewMode>("auto");

  const searchString = searchParams.toString();

  const { data, isLoading, isError, error, refetch } = useQuery<AdminTicketQueueResponse>({
    queryKey: ["adminTickets", searchString],
    queryFn: async () => {
      const res = await fetch(`/api/admin/tickets?${searchString}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error?.message ?? "Failed to load ticket queue.");
      }
      return res.json();
    },
  });

  function setPage(page: number) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("page", String(page));
    router.replace(`${pathname}?${next.toString()}`);
  }

  if (isLoading) {
    return <QueueSkeleton />;
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-proof/20 bg-proof-soft/30 p-8 text-center">
        <h2 className="font-serif text-lg font-semibold text-proof">Could not load ticket queue</h2>
        <p className="mt-1 text-sm text-ink-soft">
          {error instanceof Error ? error.message : "An unexpected network error occurred."}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 inline-flex items-center rounded-md bg-cloth px-4 py-2 text-xs font-medium text-white hover:bg-cloth-deep focus:outline-hidden"
        >
          Try again
        </button>
      </div>
    );
  }

  const tickets = data?.tickets ?? [];
  const pagination = data?.pagination ?? { page: 1, pageSize: 20, total: 0, totalPages: 1 };

  const startRecord = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const endRecord = Math.min(pagination.total, pagination.page * pagination.pageSize);

  return (
    <div className="space-y-4">
      {/* View Options & Queue Meta */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="text-xs text-ink-soft">
          {pagination.total > 0 ? (
            <span>
              Showing <strong className="font-semibold text-ink">{startRecord}–{endRecord}</strong> of{" "}
              <strong className="font-semibold text-ink">{pagination.total}</strong> tickets
            </span>
          ) : (
            <span>0 tickets</span>
          )}
        </div>

        {/* View mode toggle */}
        <div className="inline-flex items-center rounded-lg border border-rule bg-surface p-0.5 text-xs shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode("auto")}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              viewMode === "auto"
                ? "bg-paper text-ink shadow-xs"
                : "text-ink-soft hover:text-ink"
            }`}
            title="Auto-responsive (Cards on mobile/tablet, Table on desktop)"
          >
            <span>📱💻</span>
            <span className="hidden sm:inline">Auto</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              viewMode === "cards"
                ? "bg-paper text-ink shadow-xs"
                : "text-ink-soft hover:text-ink"
            }`}
            title="Card View (best for mobile and touch)"
          >
            <span>⊞</span>
            <span>Cards</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              viewMode === "table"
                ? "bg-paper text-ink shadow-xs"
                : "text-ink-soft hover:text-ink"
            }`}
            title="Table View (dense spreadsheet format)"
          >
            <span>☰</span>
            <span>Table</span>
          </button>
        </div>
      </div>

      {/* Main Ticket Queue Container */}
      <div className="overflow-hidden rounded-lg border border-rule bg-surface shadow-xs">
        {tickets.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="font-serif text-base font-medium text-ink">No tickets found</p>
            <p className="mt-1 text-xs text-ink-soft">
              No tickets match your active filter criteria. Try adjusting or clearing filters above.
            </p>
          </div>
        ) : (
          <>
            {/* 1. Mobile & Tablet Card View: visible if viewMode === 'cards' OR (viewMode === 'auto' and screen < lg) */}
            <div
              className={`divide-y divide-rule/60 ${
                viewMode === "table"
                  ? "hidden"
                  : viewMode === "cards"
                  ? "block"
                  : "block lg:hidden"
              }`}
            >
              {tickets.map((t) => (
                <TicketCard key={t.id} ticket={t} now={now} />
              ))}
            </div>

            {/* 2. Desktop Table View: visible if viewMode === 'table' OR (viewMode === 'auto' and screen >= lg) */}
            <div
              className={`overflow-x-auto ${
                viewMode === "cards"
                  ? "hidden"
                  : viewMode === "table"
                  ? "block"
                  : "hidden lg:block"
              }`}
            >
              <table className="w-full min-w-[880px] text-left text-sm text-ink">
                <thead className="border-b border-rule bg-paper/60 text-[11px] font-medium tracking-wider text-ink-soft uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-3 sm:px-6 whitespace-nowrap">
                      Urgency
                    </th>
                    <th scope="col" className="px-4 py-3 min-w-[220px]">
                      Ticket & Book
                    </th>
                    <th scope="col" className="px-4 py-3 min-w-[160px]">
                      Author
                    </th>
                    {/* Category is ALWAYS visible and never hidden */}
                    <th scope="col" className="px-4 py-3 min-w-[170px]">
                      Category
                    </th>
                    {/* Assignee is ALWAYS visible and never hidden */}
                    <th scope="col" className="px-4 py-3 min-w-[120px]">
                      Assignee
                    </th>
                    <th scope="col" className="px-4 py-3 whitespace-nowrap">
                      Age
                    </th>
                    <th scope="col" className="px-4 py-3 sm:px-6 whitespace-nowrap">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule/60">
                  {tickets.map((t) => (
                    <TicketTableRow key={t.id} ticket={t} now={now} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination Bar */}
        {pagination.total > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-rule bg-paper/30 px-4 py-3 sm:flex-row sm:px-6">
            <div className="text-xs text-ink-soft">
              Showing <span className="font-medium text-ink">{startRecord}</span> to{" "}
              <span className="font-medium text-ink">{endRecord}</span> of{" "}
              <span className="font-medium text-ink">{pagination.total}</span> tickets
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="rounded-md border border-rule bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-paper disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <span className="text-xs text-ink-soft">
                Page <span className="font-medium text-ink">{pagination.page}</span> of{" "}
                <span className="font-medium text-ink">{pagination.totalPages}</span>
              </span>

              <button
                type="button"
                onClick={() => setPage(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="rounded-md border border-rule bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-paper disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TicketCard({ ticket: t, now }: { ticket: AdminTicketDto; now: number }) {
  const createdTime = new Date(t.createdAt).getTime();
  const isOverdue = now - createdTime > OVERDUE_THRESHOLD_MS;
  const isResolvedOrClosed = t.status === "RESOLVED" || t.status === "CLOSED";

  return (
    <div className="group relative flex flex-col gap-3 p-4 transition-colors hover:bg-paper/40 sm:p-5">
      {/* Top Bar: Urgency, Status & Age */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge priority={t.priority} />
          <StatusBadge status={t.status} />
        </div>

        <span
          className={`tabular text-xs ${
            isOverdue && !isResolvedOrClosed
              ? "font-semibold text-proof"
              : "text-ink-soft"
          }`}
          title={`Created: ${new Date(t.createdAt).toLocaleString("en-IN")}`}
        >
          {formatAge(t.createdAt, now)}
          {isOverdue && !isResolvedOrClosed && (
            <span className="ml-1 text-[11px]" title="Over 48 hours in queue">
              ⚠️ Overdue
            </span>
          )}
        </span>
      </div>

      {/* Subject & Book */}
      <div className="space-y-1">
        <Link
          href={`/admin/tickets/${t.id}`}
          className="text-base font-medium text-ink transition-colors hover:text-cloth group-hover:underline"
        >
          {t.subject}
        </Link>
        {t.book && (
          <div className="mt-1 flex items-center">
            <span className="inline-flex items-center gap-1.5 rounded-sm bg-cloth-soft/60 px-2 py-0.5 text-xs text-cloth">
              <span>📖</span>
              <span className="max-w-[280px] truncate sm:max-w-md" title={t.book.title}>
                {t.book.title}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Category & AI Classification - PROMINENT & ALWAYS VISIBLE */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-[11px] font-medium tracking-wider text-ink-faint uppercase">
          Category:
        </span>
        {t.category ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-md bg-paper px-2 py-0.5 font-medium text-ink-soft">
              {CATEGORY_LABELS[t.category] ?? t.category}
            </span>
            <SourceChip
              source={t.categorySource}
              confidence={t.aiConfidence}
              reasoning={t.aiReasoning}
            />
          </div>
        ) : (
          <span className="inline-flex items-center rounded-md border border-dashed border-amber/40 bg-amber-soft/40 px-2 py-0.5 text-xs font-medium text-amber">
            Needs triage
          </span>
        )}
      </div>

      {/* Bottom Meta Bar: Author & Assignee */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rule/50 pt-3 text-xs text-ink-soft">
        <div className="flex items-center gap-1.5">
          <span className="text-ink-faint">Author:</span>
          <span className="font-medium text-ink">{t.author.name}</span>
          <span className="text-ink-faint">({t.author.email})</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-ink-faint">Assignee:</span>
          {t.assignee ? (
            <span className="font-medium text-ink">{t.assignee.name}</span>
          ) : (
            <span className="italic text-ink-faint">Unassigned</span>
          )}
        </div>
      </div>
    </div>
  );
}

function TicketTableRow({ ticket: t, now }: { ticket: AdminTicketDto; now: number }) {
  const createdTime = new Date(t.createdAt).getTime();
  const isOverdue = now - createdTime > OVERDUE_THRESHOLD_MS;
  const isResolvedOrClosed = t.status === "RESOLVED" || t.status === "CLOSED";

  return (
    <tr className="group transition-colors hover:bg-paper/40">
      {/* Urgency */}
      <td className="px-4 py-3 sm:px-6 whitespace-nowrap">
        <PriorityBadge priority={t.priority} />
      </td>

      {/* Ticket & Subject */}
      <td className="max-w-xs px-4 py-3 lg:max-w-md">
        <Link
          href={`/admin/tickets/${t.id}`}
          className="font-medium text-ink transition-colors hover:text-cloth group-hover:underline"
        >
          {t.subject}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-faint">
          {t.book && (
            <span className="inline-flex items-center gap-1 rounded-sm bg-cloth-soft/60 px-1.5 py-0.5 text-[11px] text-cloth">
              <span>📖</span>
              <span className="max-w-[160px] truncate sm:max-w-[220px]" title={t.book.title}>
                {t.book.title}
              </span>
            </span>
          )}
        </div>
      </td>

      {/* Author */}
      <td className="px-4 py-3">
        <div className="font-medium text-ink">{t.author.name}</div>
        <div className="text-xs text-ink-faint">{t.author.email}</div>
      </td>

      {/* Category & Triage Source - ALWAYS VISIBLE */}
      <td className="px-4 py-3 text-xs">
        {t.category ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-md bg-paper px-2 py-0.5 text-ink-soft">
              {CATEGORY_LABELS[t.category] ?? t.category}
            </span>
            <SourceChip
              source={t.categorySource}
              confidence={t.aiConfidence}
              reasoning={t.aiReasoning}
            />
          </div>
        ) : (
          <span className="inline-flex items-center rounded-md border border-dashed border-amber/40 bg-amber-soft/40 px-2 py-0.5 text-xs font-medium text-amber">
            Needs triage
          </span>
        )}
      </td>

      {/* Assignee - ALWAYS VISIBLE */}
      <td className="px-4 py-3 text-xs">
        {t.assignee ? (
          <span className="font-medium text-ink">{t.assignee.name}</span>
        ) : (
          <span className="italic text-ink-faint">Unassigned</span>
        )}
      </td>

      {/* Age */}
      <td className="px-4 py-3 tabular text-xs whitespace-nowrap">
        <span
          className={
            isOverdue && !isResolvedOrClosed
              ? "font-semibold text-proof"
              : "text-ink-soft"
          }
          title={`Created: ${new Date(t.createdAt).toLocaleString("en-IN")}`}
        >
          {formatAge(t.createdAt, now)}
          {isOverdue && !isResolvedOrClosed && (
            <span className="ml-1 text-[11px]" title="Over 48 hours in queue">
              ⚠️
            </span>
          )}
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-3 sm:px-6 whitespace-nowrap">
        <StatusBadge status={t.status} />
      </td>
    </tr>
  );
}

export function QueueSkeleton() {
  return (
    <div className="space-y-4">
      {/* Mobile/Tablet Card Skeleton */}
      <div className="space-y-3 lg:hidden">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-lg border border-rule bg-surface p-4 space-y-3 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="h-5 w-24 rounded-full bg-rule/50" />
              <div className="h-5 w-16 rounded-full bg-rule/40" />
            </div>
            <div className="h-5 w-3/4 rounded bg-rule/60" />
            <div className="h-4 w-1/2 rounded bg-rule/40" />
            <div className="flex items-center justify-between border-t border-rule/40 pt-2.5">
              <div className="h-4 w-32 rounded bg-rule/40" />
              <div className="h-4 w-24 rounded bg-rule/40" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table Skeleton */}
      <div className="hidden lg:block overflow-hidden rounded-lg border border-rule bg-surface shadow-xs">
        <div className="divide-y divide-rule/60">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex animate-pulse items-center justify-between p-4 sm:px-6">
              <div className="flex items-center gap-4">
                <div className="h-6 w-20 rounded-full bg-rule/50" />
                <div className="space-y-2">
                  <div className="h-4 w-60 rounded bg-rule/60" />
                  <div className="h-3 w-36 rounded bg-rule/40" />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="h-4 w-24 rounded bg-rule/40" />
                <div className="h-4 w-20 rounded bg-rule/40" />
                <div className="h-6 w-16 rounded-full bg-rule/50" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
