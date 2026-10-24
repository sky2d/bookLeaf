"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/Button";
import { ErrorBlock, LoadingBlock } from "@/components/ui/States";
import { api } from "@/lib/apiClient";
import { formatDateTime } from "@/lib/format";
import type { MyTicketsResponse } from "@/shared/dto";

export const myTicketsQuery = {
  queryKey: ["tickets"],
  queryFn: () => api<MyTicketsResponse>("/api/tickets"),
};

export function MyTickets() {
  const { data, error, isPending, refetch } = useQuery(myTicketsQuery);

  if (isPending) {
    return <LoadingBlock label="Loading your queries…" lines={4} />;
  }

  if (error) {
    return (
      <ErrorBlock
        message="We could not load your queries just now."
        onRetry={() => refetch()}
      />
    );
  }

  const tickets = data?.tickets ?? [];

  if (tickets.length === 0) {
    return (
      <div className="rounded-lg border border-rule bg-surface p-8 text-center sm:p-12">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-cloth-soft text-cloth">
          <span className="text-xl" aria-hidden="true">💬</span>
        </div>
        <h2 className="mt-4 font-serif text-xl font-semibold text-ink">No queries raised yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
          Have a question about your books, royalty calculations, or production progress? Submit a support query and our
          team will assist you.
        </p>
        <div className="mt-6">
          <Link href="/author/tickets/new">
            <Button variant="primary">Raise your first query</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {tickets.map((t) => (
        <Link
          key={t.id}
          href={`/author/tickets/${t.id}`}
          className="group block rounded-lg border border-rule bg-surface p-5 shadow-2xs transition-all hover:border-rule-strong hover:bg-surface-tint/20 hover:shadow-xs"
        >
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-serif text-lg font-semibold text-ink transition-colors group-hover:text-cloth">
                  {t.subject}
                </h2>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                <span className="font-mono text-ink-faint">ID: {t.id}</span>
                <span>•</span>
                <span>{t.book ? `Book: ${t.book.title}` : "General Inquiry"}</span>
                <span>•</span>
                <span>Updated {formatDateTime(t.updatedAt)}</span>
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
              <StatusBadge status={t.status} />
              <span className="text-sm font-medium text-cloth opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true">
                View thread →
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
