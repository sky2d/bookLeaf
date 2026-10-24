import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminTicketQueue, QueueSkeleton } from "./AdminTicketQueue";
import { QueueFilters } from "./QueueFilters";

export const metadata: Metadata = {
  title: "Ticket Queue — BookLeaf Support",
  description: "Support ticket triage queue with priority ordering, filtering, and author query management.",
};

export default function TicketQueuePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Ticket queue</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Triaged queries across all authors, ordered by urgency and age.
          </p>
        </div>
      </div>

      <Suspense fallback={<QueueSkeleton />}>
        <QueueFilters />
        <AdminTicketQueue />
      </Suspense>
    </div>
  );
}
