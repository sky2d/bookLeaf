"use client";

import { useState } from "react";
import { formatDateTime } from "@/lib/format";
import type { AdminTicketDetailDto } from "@/shared/dto";

export function TicketConversation({
  ticket,
  onReplySent,
}: {
  ticket: AdminTicketDetailDto;
  onReplySent: () => void | Promise<unknown>;
}) {
  const [replyBody, setReplyBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isClosed = ticket.status === "CLOSED";

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyBody.trim() || isClosed) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/tickets/${ticket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyBody.trim() }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error?.message ?? "Failed to send reply.");
      }

      setReplyBody("");
      await onReplySent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reply.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Original Ticket Post */}
      <div className="rounded-lg border border-rule bg-surface p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-rule/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-ink">{ticket.author.name}</span>
            <span className="rounded-full bg-paper px-2 py-0.5 text-[10px] font-medium text-ink-soft border border-rule">
              Author
            </span>
          </div>
          <span className="text-xs text-ink-faint">{formatDateTime(ticket.createdAt)}</span>
        </div>

        <p className="mt-3 whitespace-pre-wrap text-sm text-ink leading-relaxed">
          {ticket.description}
        </p>

        {ticket.attachmentName && (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-rule bg-paper/50 px-3 py-2 text-xs text-ink-soft">
            <span aria-hidden="true">📎</span>
            <span>Attachment: {ticket.attachmentName}</span>
          </div>
        )}
      </div>

      {/* Conversation Thread Messages */}
      {ticket.messages.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-serif text-sm font-semibold text-ink-soft">Conversation History</h3>

          {ticket.messages.map((m) => {
            const isAdmin = m.senderRole === "ADMIN";

            return (
              <div
                key={m.id}
                className={`rounded-lg border p-4 text-sm shadow-xs ${
                  isAdmin
                    ? "border-cloth/20 bg-cloth-soft/30 ml-4 sm:ml-8"
                    : "border-rule bg-surface mr-4 sm:mr-8"
                }`}
              >
                <div className="flex items-center justify-between border-b border-rule/40 pb-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">{m.senderName}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        isAdmin
                          ? "bg-cloth text-white"
                          : "bg-paper text-ink-soft border border-rule"
                      }`}
                    >
                      {isAdmin ? "Team BookLeaf" : "Author"}
                    </span>
                    {m.usedAiDraft && (
                      <span className="text-[10px] text-cloth-deep">✨ Started from AI draft</span>
                    )}
                  </div>
                  <span className="text-ink-faint">{formatDateTime(m.createdAt)}</span>
                </div>

                <p className="mt-2.5 whitespace-pre-wrap text-ink leading-relaxed">{m.body}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Reply Composer */}
      <div className="rounded-lg border border-rule bg-surface p-5 shadow-xs">
        <h3 className="font-serif text-base font-semibold text-ink">Reply to Author</h3>

        {ticket.status === "OPEN" && (
          <p className="mt-1 text-xs text-cloth">
            💡 Sending a reply will automatically move this ticket from <strong>Open</strong> to{" "}
            <strong>In Progress</strong>.
          </p>
        )}

        {isClosed ? (
          <div className="mt-3 rounded-md border border-rule bg-paper p-3 text-xs text-ink-soft">
            This ticket is closed and cannot receive replies. Reopen the ticket in Ticket Controls if
            you need to follow up.
          </div>
        ) : (
          <form onSubmit={handleSendReply} className="mt-3 space-y-3">
            <textarea
              rows={4}
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Write a clear, courteous reply to the author..."
              disabled={isSubmitting}
              className="w-full rounded-md border border-rule bg-surface p-3 text-sm text-ink placeholder:text-ink-faint focus:border-cloth focus:outline-hidden disabled:opacity-50"
            />

            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-faint">{replyBody.length} / 5,000</span>

              <button
                type="submit"
                disabled={isSubmitting || !replyBody.trim()}
                className="rounded-md bg-cloth px-4 py-2 text-xs font-medium text-white hover:bg-cloth-deep focus:outline-hidden disabled:opacity-40"
              >
                {isSubmitting ? "Sending..." : "Send Reply to Author"}
              </button>
            </div>

            {error && <p className="text-xs font-medium text-proof">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
