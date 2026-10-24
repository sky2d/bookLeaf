"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Field, Textarea } from "@/components/ui/Field";
import { ErrorBlock, LoadingBlock } from "@/components/ui/States";
import { ApiError, api } from "@/lib/apiClient";
import { formatDateTime } from "@/lib/format";
import type { AuthorTicketResponse, CreateMessageResponse } from "@/shared/dto";
import { createMessageSchema } from "@/shared/schemas/ticket";

export function TicketThread({ ticketId }: { ticketId: string }) {
  const queryClient = useQueryClient();
  const [replyBody, setReplyBody] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: ticket,
    error,
    isPending,
    refetch,
  } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => api<AuthorTicketResponse>(`/api/tickets/${ticketId}`).then((r) => r.ticket),
  });

  if (isPending) {
    return <LoadingBlock label="Loading ticket details…" lines={4} />;
  }

  if (error) {
    return (
      <ErrorBlock
        message={error instanceof ApiError && error.status === 404 ? "Ticket not found." : "We could not load this ticket."}
        onRetry={() => refetch()}
      />
    );
  }

  const isClosed = ticket.status === "CLOSED";
  const isResolved = ticket.status === "RESOLVED";

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null);
    setFormError(null);

    const validation = createMessageSchema.safeParse({ body: replyBody });
    if (!validation.success) {
      setFieldError(validation.error.issues[0]?.message ?? "Message cannot be empty.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api<CreateMessageResponse>(`/api/tickets/${ticketId}/messages`, {
        method: "POST",
        json: validation.data,
      });

      setReplyBody("");
      await queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      await queryClient.invalidateQueries({ queryKey: ["tickets"] });
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError("Failed to send message. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Ticket Header & Metadata */}
      <section className="rounded-lg border border-rule bg-surface p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {ticket.subject}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-ink-soft">
              <span className="font-mono text-xs text-ink-faint">ID: {ticket.id}</span>
              <span>•</span>
              <StatusBadge status={ticket.status} />
              <span>•</span>
              <span>Opened {formatDateTime(ticket.createdAt)}</span>
              {ticket.book ? (
                <>
                  <span>•</span>
                  <span>
                    Book:{" "}
                    <Link
                      href={`/author/books#${ticket.book.id}`}
                      className="font-medium text-cloth underline-offset-4 hover:underline"
                    >
                      {ticket.book.title}
                    </Link>
                  </span>
                </>
              ) : (
                <>
                  <span>•</span>
                  <span>General Inquiry</span>
                </>
              )}
            </div>
          </div>
        </div>

        {ticket.attachmentName && (
          <div className="mt-4 inline-flex items-center gap-2 rounded border border-rule bg-paper px-3 py-1.5 text-xs text-ink-soft">
            <span className="text-ink-faint" aria-hidden="true">📎</span>
            <span>Attached file name:</span>
            <span className="font-mono font-medium text-ink">{ticket.attachmentName}</span>
          </div>
        )}
      </section>

      {/* Conversation Thread */}
      <section aria-label="Conversation thread" className="flex flex-col gap-5">
        {/* Original Ticket Description */}
        <article className="rounded-lg border border-rule bg-surface p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-rule pb-3">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-cloth" aria-hidden="true" />
              <span className="font-semibold text-sm text-ink">Your Original Query</span>
            </div>
            <time className="text-xs text-ink-faint" dateTime={ticket.createdAt}>
              {formatDateTime(ticket.createdAt)}
            </time>
          </div>
          <div className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
            {ticket.description}
          </div>
        </article>

        {/* Follow-up Messages */}
        {ticket.messages.map((msg) => {
          const isAdmin = msg.senderRole === "ADMIN";
          return (
            <article
              key={msg.id}
              className={`rounded-lg border p-6 shadow-xs transition-colors ${
                isAdmin
                  ? "border-cloth/30 bg-cloth-soft/30"
                  : "border-rule bg-surface"
              }`}
            >
              <div className="flex items-center justify-between border-b border-rule/60 pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`size-2 rounded-full ${isAdmin ? "bg-cloth" : "bg-ink-faint"}`}
                    aria-hidden="true"
                  />
                  <span className="font-semibold text-sm text-ink">{msg.senderName}</span>
                  {isAdmin && (
                    <span className="rounded bg-cloth px-1.5 py-0.5 text-[11px] font-medium text-white">
                      Support
                    </span>
                  )}
                </div>
                <time className="text-xs text-ink-faint" dateTime={msg.createdAt}>
                  {formatDateTime(msg.createdAt)}
                </time>
              </div>
              <div className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
                {msg.body}
              </div>
            </article>
          );
        })}
      </section>

      {/* Reply or Status Notice */}
      <section aria-label="Reply to ticket" className="rounded-lg border border-rule bg-surface p-6">
        {isClosed ? (
          <div className="rounded-md bg-paper p-4 text-center text-sm text-ink-soft">
            <p className="font-medium text-ink">This ticket is closed</p>
            <p className="mt-1 text-ink-soft">
              No further replies can be sent on this thread. If you have an additional question or issue, please{" "}
              <Link href="/author/tickets/new" className="font-medium text-cloth underline-offset-4 hover:underline">
                raise a new query
              </Link>
              .
            </p>
          </div>
        ) : (
          <form onSubmit={handleSendReply} noValidate className="flex flex-col gap-4">
            {isResolved && (
              <div role="status" className="rounded-md bg-leaf-soft px-4 py-3 text-sm text-leaf">
                <span className="font-medium">Note:</span> This ticket is marked as resolved. Sending a new reply will
                automatically reopen it for our team.
              </div>
            )}

            {formError && (
              <div role="alert" className="rounded-md bg-proof-soft px-4 py-3 text-sm text-proof">
                {formError}
              </div>
            )}

            <Field
              id="reply-message"
              label="Add a follow-up reply"
              hint="Be as detailed as possible to help our team resolve your query."
              error={fieldError ?? undefined}
            >
              <Textarea
                id="reply-message"
                name="reply"
                rows={4}
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Type your message here…"
                aria-invalid={Boolean(fieldError)}
                required
              />
            </Field>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" disabled={isSubmitting || !replyBody.trim()}>
                {isSubmitting ? "Sending reply…" : "Send reply"}
              </Button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
