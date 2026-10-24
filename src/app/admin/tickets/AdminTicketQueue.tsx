"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PriorityBadge } from "@/components/PriorityBadge";
import { SourceChip } from "@/components/SourceChip";
import { StatusBadge } from "@/components/StatusBadge";
import { formatAge } from "@/lib/format";
import type { AdminTicketQueueResponse } from "@/shared/dto";

const CATEGORY_LABELS: Record<string, string> = {
  ROYALTY_PAYMENTS: "Royalty & Payments",
  ISBN_METADATA: "ISBN & Metadata",
  PRINTING_QUALITY: "Printing Quality",
  DISTRIBUTION_AVAILABILITY: "Distribution",
  BOOK_STATUS_PRODUCTION: "Production",
  GENERAL_INQUIRY: "General",
};

const OVERDUE_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 hours

export function AdminTicketQueue() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [now] = useState(() => Date.now());

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
      {/* Table Card */}
      <div className="overflow-hidden rounded-lg border border-rule bg-surface shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-ink">
            <thead className="border-b border-rule bg-paper/60 text-[11px] font-medium tracking-wider text-ink-soft uppercase">
              <tr>
                <th scope="col" className="px-4 py-3 sm:px-6">
                  Urgency
                </th>
                <th scope="col" className="px-4 py-3">
                  Ticket & Book
                </th>
                <th scope="col" className="px-4 py-3">
                  Author
                </th>
                <th scope="col" className="hidden px-4 py-3 md:table-cell">
                  Category
                </th>
                <th scope="col" className="hidden px-4 py-3 sm:table-cell">
                  Assignee
                </th>
                <th scope="col" className="px-4 py-3">
                  Age
                </th>
                <th scope="col" className="px-4 py-3 sm:px-6">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule/60">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <p className="font-serif text-base font-medium text-ink">No tickets found</p>
                    <p className="mt-1 text-xs text-ink-soft">
                      No tickets match your active filter criteria. Try adjusting or clearing filters above.
                    </p>
                  </td>
                </tr>
              ) : (
                tickets.map((t) => {
                  const createdTime = new Date(t.createdAt).getTime();
                  const isOverdue = now - createdTime > OVERDUE_THRESHOLD_MS;
                  const isResolvedOrClosed = t.status === "RESOLVED" || t.status === "CLOSED";

                  return (
                    <tr
                      key={t.id}
                      className="group transition-colors hover:bg-paper/40"
                    >
                      {/* Urgency */}
                      <td className="px-4 py-3 sm:px-6">
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

                      {/* Category & Triage Source */}
                      <td className="hidden px-4 py-3 text-xs md:table-cell">
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
                          <span className="italic text-ink-faint">Needs triage</span>
                        )}
                      </td>

                      {/* Assignee */}
                      <td className="hidden px-4 py-3 text-xs sm:table-cell">
                        {t.assignee ? (
                          <span className="font-medium text-ink">{t.assignee.name}</span>
                        ) : (
                          <span className="italic text-ink-faint">Unassigned</span>
                        )}
                      </td>

                      {/* Age */}
                      <td className="px-4 py-3 tabular text-xs">
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
                      <td className="px-4 py-3 sm:px-6">
                        <StatusBadge status={t.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

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

export function QueueSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-rule bg-surface shadow-xs">
      <div className="divide-y divide-rule/60">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex animate-pulse items-center justify-between p-4 sm:px-6">
            <div className="flex items-center gap-4">
              <div className="h-6 w-16 rounded-full bg-rule/50" />
              <div className="space-y-2">
                <div className="h-4 w-48 rounded bg-rule/60 sm:w-72" />
                <div className="h-3 w-32 rounded bg-rule/40" />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="hidden h-4 w-20 rounded bg-rule/40 sm:block" />
              <div className="h-6 w-16 rounded-full bg-rule/50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
