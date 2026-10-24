import "server-only";
import { db } from "@/server/db";

export interface UpsertDraftData {
  ticketId: string;
  body: string;
  model: string;
  basedOnMessageCount: number;
}

export const aiDraftRepo = {
  /**
   * Retrieves the cached draft for a ticket, returning it only if it is fresh
   * (i.e. basedOnMessageCount strictly matches the current ticket message count).
   */
  async getValidDraft(ticketId: string, currentMessageCount: number) {
    const draft = await db.aiDraft.findUnique({
      where: { ticketId },
    });

    if (!draft) return null;

    if (draft.basedOnMessageCount !== currentMessageCount) {
      // Draft was generated on an older thread state; invalidate
      return null;
    }

    return draft;
  },

  /**
   * Persists or updates the cached draft for a ticket.
   */
  async upsertDraft(data: UpsertDraftData) {
    return db.aiDraft.upsert({
      where: { ticketId: data.ticketId },
      create: {
        ticketId: data.ticketId,
        body: data.body,
        model: data.model,
        basedOnMessageCount: data.basedOnMessageCount,
      },
      update: {
        body: data.body,
        model: data.model,
        basedOnMessageCount: data.basedOnMessageCount,
        createdAt: new Date(),
      },
    });
  },

  /**
   * Deletes a cached draft for a ticket if present.
   */
  async deleteDraft(ticketId: string) {
    try {
      return await db.aiDraft.delete({
        where: { ticketId },
      });
    } catch {
      return null;
    }
  },
};
