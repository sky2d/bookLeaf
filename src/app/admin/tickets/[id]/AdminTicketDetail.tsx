"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PriorityBadge } from "@/components/PriorityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { formatAge } from "@/lib/format";
import type { AdminTicketDetailResponse } from "@/shared/dto";
import type { UpdateTicketInput } from "@/shared/schemas/adminTicket";
import { AuthorContextSidebar } from "./AuthorContextSidebar";
import { InternalNotesPanel } from "./InternalNotesPanel";
import { TicketControls } from "./TicketControls";
import { TicketConversation } from "./TicketConversation";

export function AdminTicketDetail({ ticketId }: { ticketId: string }) {
  const [now] = useState(() => Date.now());
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Load ticket details
  const { data, isLoading, isError, error, refetch } = useQuery<AdminTicketDetailResponse>({
    queryKey: ["adminTicket", ticketId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/tickets/${ticketId}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error?.message ?? "Failed to load ticket.");
      }
      return res.json();
    },
  });

  // Load current admin session user for "Assign to me"
  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/me");
      if (!res.ok) return null;
      return res.json();
    },
  });

  const currentAdminId = meData?.user?.id;

  async function handleUpdate(input: UpdateTicketInput) {
    setIsUpdating(true);
    setUpdateError(null);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error?.message ?? "Failed to update ticket.");
      }

      await refetch();
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setIsUpdating(false);
    }
  }

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (isError || !data?.ticket) {
    return (
      <div className="rounded-lg border border-proof/20 bg-proof-soft/30 p-8 text-center space-y-3">
        <h2 className="font-serif text-lg font-semibold text-proof">Could not load ticket</h2>
        <p className="text-sm text-ink-soft">
          {error instanceof Error ? error.message : "Ticket not found or network error."}
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/admin/tickets"
            className="rounded-md border border-rule bg-surface px-4 py-2 text-xs font-medium text-ink hover:bg-paper"
          >
            ← Back to queue
          </Link>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-md bg-cloth px-4 py-2 text-xs font-medium text-white hover:bg-cloth-deep"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const ticket = data.ticket;

  return (
    <div className="space-y-6">
      {/* Top Navigation & Breadcrumb */}
      <div>
        <Link
          href="/admin/tickets"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-cloth hover:text-cloth-deep hover:underline"
        >
          <span>← Back to ticket queue</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="rounded-lg border border-rule bg-surface p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-ink-faint">#{ticket.id.slice(-8)}</span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
            </div>
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-ink">
              {ticket.subject}
            </h1>
            <p className="text-xs text-ink-faint">
              Raised by <span className="font-medium text-ink">{ticket.author.name}</span> • Created{" "}
              {formatAge(ticket.createdAt, now)} ago
            </p>
          </div>
        </div>

        {updateError && (
          <div className="mt-4 rounded-md border border-proof/20 bg-proof-soft/50 p-2.5 text-xs font-medium text-proof">
            {updateError}
          </div>
        )}
      </div>

      {/* 2-Column Responsive Workspace */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left / Main Column: Conversation & Internal Notes */}
        <div className="space-y-6 lg:col-span-8">
          <TicketConversation
            ticket={ticket}
            onReplySent={async () => {
              await refetch();
            }}
          />
          <InternalNotesPanel
            ticketId={ticket.id}
            notes={ticket.notes}
            onNoteAdded={async () => {
              await refetch();
            }}
          />
        </div>

        {/* Right Column: Ticket Controls & Author Context */}
        <div className="space-y-6 lg:col-span-4">
          <TicketControls
            ticket={ticket}
            currentAdminId={currentAdminId}
            onUpdate={handleUpdate}
            isUpdating={isUpdating}
          />
          <AuthorContextSidebar ticket={ticket} />
        </div>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-4 w-32 rounded bg-rule/50" />
      <div className="h-28 rounded-lg bg-rule/40" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <div className="h-64 rounded-lg bg-rule/40" />
          <div className="h-44 rounded-lg bg-rule/40" />
        </div>
        <div className="space-y-6 lg:col-span-4">
          <div className="h-72 rounded-lg bg-rule/40" />
          <div className="h-60 rounded-lg bg-rule/40" />
        </div>
      </div>
    </div>
  );
}
