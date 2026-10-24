"use client";

import { useState } from "react";
import { formatDateTime } from "@/lib/format";
import type { InternalNoteDto } from "@/shared/dto";

export function InternalNotesPanel({
  ticketId,
  notes,
  onNoteAdded,
}: {
  ticketId: string;
  notes: InternalNoteDto[];
  onNoteAdded: () => void | Promise<unknown>;
}) {
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error?.message ?? "Failed to save note.");
      }

      setBody("");
      await onNoteAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add note.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-amber/30 bg-amber-soft/20 p-5 shadow-xs space-y-4">
      {/* Header with Privacy Notice */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base" aria-hidden="true">
            🔒
          </span>
          <h3 className="font-serif text-base font-semibold text-ink">Internal Notes</h3>
        </div>
        <span className="rounded-full bg-amber-soft px-2.5 py-0.5 text-[11px] font-medium text-amber border border-amber/30">
          Only visible to BookLeaf team
        </span>
      </div>

      {/* Notes Stream */}
      <div className="space-y-3">
        {notes.length === 0 ? (
          <p className="text-xs italic text-ink-faint">
            No internal notes recorded yet. Add notes here for private team context (e.g. phone
            conversations, escalations).
          </p>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="rounded-md border border-amber/20 bg-surface p-3 text-xs shadow-2xs space-y-1"
            >
              <div className="flex items-center justify-between text-ink-faint">
                <span className="font-medium text-ink">{note.adminName}</span>
                <span className="text-[11px]">{formatDateTime(note.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap text-ink">{note.body}</p>
            </div>
          ))
        )}
      </div>

      {/* Add Note Form */}
      <form onSubmit={handleSubmit} className="space-y-2 border-t border-amber/20 pt-3">
        <label htmlFor="internal-note-input" className="block text-xs font-medium text-ink-soft">
          Add Private Note
        </label>
        <textarea
          id="internal-note-input"
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type an internal note for the team..."
          disabled={isSubmitting}
          className="w-full rounded-md border border-rule bg-surface p-2.5 text-xs text-ink placeholder:text-ink-faint focus:border-amber focus:outline-hidden disabled:opacity-50"
        />

        {error && <p className="text-xs font-medium text-proof">{error}</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !body.trim()}
            className="rounded-md bg-amber px-3 py-1.5 text-xs font-medium text-white hover:bg-amber/90 focus:outline-hidden disabled:opacity-40"
          >
            {isSubmitting ? "Saving..." : "Add Note"}
          </button>
        </div>
      </form>
    </div>
  );
}
