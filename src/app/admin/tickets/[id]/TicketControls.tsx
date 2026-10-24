"use client";

import { useState } from "react";
import type { TicketCategory, TicketPriority, TicketStatus } from "@/generated/prisma/enums";
import { SourceChip } from "@/components/SourceChip";
import type { AdminTicketDetailDto } from "@/shared/dto";
import type { UpdateTicketInput } from "@/shared/schemas/adminTicket";

const CATEGORIES: Array<{ value: TicketCategory; label: string }> = [
  { value: "ROYALTY_PAYMENTS", label: "Royalty & Payments" },
  { value: "ISBN_METADATA", label: "ISBN & Metadata" },
  { value: "PRINTING_QUALITY", label: "Printing Quality" },
  { value: "DISTRIBUTION_AVAILABILITY", label: "Distribution & Availability" },
  { value: "BOOK_STATUS_PRODUCTION", label: "Production Status" },
  { value: "GENERAL_INQUIRY", label: "General Inquiry" },
];

const PRIORITIES: Array<{ value: TicketPriority; label: string }> = [
  { value: "CRITICAL", label: "Critical" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

const STATUSES: Array<{ value: TicketStatus; label: string }> = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

export function TicketControls({
  ticket,
  currentAdminId,
  onUpdate,
  isUpdating,
  onRefresh,
}: {
  ticket: AdminTicketDetailDto;
  currentAdminId?: string;
  onUpdate: (input: UpdateTicketInput) => Promise<void>;
  isUpdating: boolean;
  onRefresh?: () => Promise<unknown> | unknown;
}) {
  const isAssignedToMe = Boolean(currentAdminId && ticket.assignee?.id === currentAdminId);
  const [isRetriaging, setIsRetriaging] = useState(false);
  const [retriageMessage, setRetriageMessage] = useState<string | null>(null);

  async function handleRetriage() {
    setIsRetriaging(true);
    setRetriageMessage(null);
    try {
      const res = await fetch(`/api/admin/tickets/${ticket.id}/classify`, {
        method: "POST",
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error?.message ?? "Failed to re-triage ticket.");
      }
      setRetriageMessage("Triage updated!");
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      setRetriageMessage(err instanceof Error ? err.message : "Re-triage failed.");
    } finally {
      setIsRetriaging(false);
    }
  }

  return (
    <div className="rounded-lg border border-rule bg-surface p-5 shadow-xs space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-base font-semibold text-ink">Ticket Controls</h3>
        <button
          type="button"
          disabled={isRetriaging || isUpdating}
          onClick={handleRetriage}
          className="inline-flex items-center gap-1 rounded-md border border-rule bg-paper/60 px-2.5 py-1 text-xs font-medium text-ink-soft transition-colors hover:bg-paper hover:text-ink disabled:opacity-50"
          title="Re-run AI auto-classification and priority triage"
        >
          <span>{isRetriaging ? "⏳" : "✨"}</span>
          <span>{isRetriaging ? "Triaging..." : "Re-triage"}</span>
        </button>
      </div>

      {retriageMessage && (
        <p className="text-[11px] text-cloth-deep font-medium bg-cloth-soft/40 px-2 py-1 rounded">
          {retriageMessage}
        </p>
      )}

      {/* Status */}
      <div>
        <label htmlFor="control-status" className="block text-xs font-medium text-ink-soft">
          Status
        </label>
        <select
          id="control-status"
          value={ticket.status}
          disabled={isUpdating}
          onChange={(e) => onUpdate({ status: e.target.value as TicketStatus })}
          className="mt-1 w-full rounded-md border border-rule bg-surface px-3 py-1.5 text-xs font-medium text-ink focus:border-cloth focus:outline-hidden disabled:opacity-50"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {ticket.resolvedAt && (
          <p className="mt-1 text-[11px] text-ink-faint">
            Resolved: {new Date(ticket.resolvedAt).toLocaleString("en-IN")}
          </p>
        )}
      </div>

      {/* Priority & Source */}
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="control-priority" className="block text-xs font-medium text-ink-soft">
            Urgency / Priority
          </label>
          <SourceChip
            source={ticket.prioritySource}
            confidence={ticket.aiConfidence}
            reasoning={ticket.aiReasoning}
          />
        </div>
        <select
          id="control-priority"
          value={ticket.priority ?? ""}
          disabled={isUpdating}
          onChange={(e) => onUpdate({ priority: e.target.value as TicketPriority })}
          className="mt-1 w-full rounded-md border border-rule bg-surface px-3 py-1.5 text-xs font-medium text-ink focus:border-cloth focus:outline-hidden disabled:opacity-50"
        >
          {!ticket.priority && <option value="">Needs triage</option>}
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* Category & Source */}
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="control-category" className="block text-xs font-medium text-ink-soft">
            Inquiry Category
          </label>
          <SourceChip
            source={ticket.categorySource}
            confidence={ticket.aiConfidence}
            reasoning={ticket.aiReasoning}
          />
        </div>
        <select
          id="control-category"
          value={ticket.category ?? ""}
          disabled={isUpdating}
          onChange={(e) => onUpdate({ category: e.target.value as TicketCategory })}
          className="mt-1 w-full rounded-md border border-rule bg-surface px-3 py-1.5 text-xs text-ink focus:border-cloth focus:outline-hidden disabled:opacity-50"
        >
          {!ticket.category && <option value="">Needs triage</option>}
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* AI Reasoning Callout */}
      {ticket.aiReasoning && (
        <div className="rounded-md border border-rule/60 bg-paper/50 p-2.5 text-xs">
          <div className="flex items-center gap-1 font-medium text-ink-soft text-[11px]">
            <span>💡</span>
            <span>Triage Reasoning</span>
            {ticket.aiConfidence != null && (
              <span className="ml-auto text-ink-faint text-[10px]">
                {Math.round(ticket.aiConfidence * 100)}% confidence
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
            {ticket.aiReasoning}
          </p>
        </div>
      )}

      {/* Assignee & Quick Actions */}
      <div className="border-t border-rule/60 pt-4">
        <label className="block text-xs font-medium text-ink-soft">Assignment</label>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <div>
            {ticket.assignee ? (
              <div>
                <p className="text-xs font-medium text-ink">{ticket.assignee.name}</p>
                <p className="text-[11px] text-ink-faint">{ticket.assignee.email}</p>
              </div>
            ) : (
              <p className="text-xs italic text-ink-faint">Unassigned</p>
            )}
          </div>

          <div>
            {isAssignedToMe ? (
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => onUpdate({ assigneeId: null })}
                className="rounded-md border border-rule bg-surface px-2.5 py-1 text-xs font-medium text-ink-soft hover:bg-paper disabled:opacity-50"
              >
                Unassign
              </button>
            ) : (
              <button
                type="button"
                disabled={isUpdating || !currentAdminId}
                onClick={() => currentAdminId && onUpdate({ assigneeId: currentAdminId })}
                className="rounded-md bg-cloth px-2.5 py-1 text-xs font-medium text-white hover:bg-cloth-deep disabled:opacity-50"
              >
                Assign to me
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
