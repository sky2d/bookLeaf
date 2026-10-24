"use client";

import { useCallback, useEffect, useState } from "react";
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
  const [isLoadingDraft, setIsLoadingDraft] = useState(!isClosed);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isCachedDraft, setIsCachedDraft] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [usedAiDraft, setUsedAiDraft] = useState(false);

  const fetchDraft = useCallback(
    async (regenerate = false) => {
      if (isClosed) return;

      if (regenerate) {
        setIsRegenerating(true);
      } else {
        setIsLoadingDraft(true);
      }
      setDraftError(null);

      try {
        const query = regenerate ? "?regenerate=true" : "";
        const res = await fetch(`/api/admin/tickets/${ticket.id}/draft${query}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error?.message ?? "AI draft unavailable");
        }
        const data = (await res.json()) as { draft: string; cached: boolean };
        setReplyBody(data.draft);
        setIsCachedDraft(data.cached);
        setUsedAiDraft(true);
      } catch (err) {
        setDraftError(err instanceof Error ? err.message : "Failed to load AI draft");
      } finally {
        setIsLoadingDraft(false);
        setIsRegenerating(false);
      }
    },
    [ticket.id, isClosed],
  );

  useEffect(() => {
    if (isClosed) return;

    let isMounted = true;
    fetch(`/api/admin/tickets/${ticket.id}/draft`)
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error?.message ?? "AI draft unavailable");
        }
        return res.json() as Promise<{ draft: string; cached: boolean }>;
      })
      .then((data) => {
        if (isMounted) {
          setReplyBody(data.draft);
          setIsCachedDraft(data.cached);
          setUsedAiDraft(true);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setDraftError(err instanceof Error ? err.message : "Failed to load AI draft");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingDraft(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [ticket.id, isClosed]);

  function handleClearDraft() {
    setReplyBody("");
    setUsedAiDraft(false);
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyBody.trim() || isClosed) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/tickets/${ticket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyBody.trim(), usedAiDraft }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error?.message ?? "Failed to send reply.");
      }

      setReplyBody("");
      setUsedAiDraft(false);
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
        ) : isLoadingDraft ? (
          <div className="mt-4 space-y-3 rounded-md border border-cloth/20 bg-cloth-soft/20 p-4 animate-pulse">
            <div className="flex items-center gap-2 text-xs font-medium text-cloth-deep">
              <span className="inline-block animate-spin">✨</span>
              <span>Generating AI draft with policy context...</span>
            </div>
            <div className="h-3 w-4/5 rounded bg-cloth/10" />
            <div className="h-3 w-3/5 rounded bg-cloth/10" />
            <div className="h-3 w-2/3 rounded bg-cloth/10" />
          </div>
        ) : (
          <form onSubmit={handleSendReply} className="mt-3 space-y-3">
            {/* AI Draft Banner */}
            {usedAiDraft && replyBody.trim() ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-cloth/30 bg-cloth-soft/40 px-3 py-2 text-xs text-cloth-deep">
                <div className="flex items-center gap-1.5 font-medium">
                  <span>✨</span>
                  <span>AI draft generated — review or edit before sending</span>
                  {isCachedDraft && (
                    <span className="rounded-full bg-cloth/10 px-1.5 py-0.5 text-[10px] text-cloth border border-cloth/20">
                      Cached
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fetchDraft(true)}
                    disabled={isRegenerating || isSubmitting}
                    className="font-medium text-cloth hover:text-cloth-deep hover:underline disabled:opacity-50"
                  >
                    {isRegenerating ? "Regenerating..." : "↻ Regenerate"}
                  </button>
                  <span className="text-rule">|</span>
                  <button
                    type="button"
                    onClick={handleClearDraft}
                    className="text-ink-soft hover:text-ink hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : draftError ? (
              <div className="flex items-center justify-between rounded-md border border-rule bg-paper px-3 py-2 text-xs text-ink-soft">
                <span>⚠️ AI draft unavailable — please write a reply manually</span>
                <button
                  type="button"
                  onClick={() => fetchDraft(false)}
                  className="font-medium text-cloth hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink-faint">Manual reply mode</span>
                <button
                  type="button"
                  onClick={() => fetchDraft(true)}
                  disabled={isRegenerating || isSubmitting}
                  className="text-xs font-medium text-cloth hover:underline disabled:opacity-50"
                >
                  {isRegenerating ? "Generating..." : "✨ Generate AI draft"}
                </button>
              </div>
            )}

            <textarea
              rows={6}
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
