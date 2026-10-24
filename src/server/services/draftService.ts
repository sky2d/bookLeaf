import "server-only";
import { buildDraftContext } from "@/server/ai/contextBuilder";
import { generateDraft } from "@/server/ai/drafter";
import { aiDraftRepo } from "@/server/repositories/aiDraftRepo";

export interface DraftResponse {
  draft: string;
  cached: boolean;
  model: string;
  basedOnMessageCount: number;
}

export const draftService = {
  /**
   * Retrieves an AI-drafted reply for a ticket.
   * If a fresh draft exists in cache for the current message count and regenerate is not requested,
   * returns the cached draft immediately without invoking the LLM.
   * Otherwise compiles targeted context, generates a new draft with Gemini, and updates the cache.
   */
  async getOrGenerateDraft(
    ticketId: string,
    options: { regenerate?: boolean } = {},
  ): Promise<DraftResponse> {
    const context = await buildDraftContext(ticketId);

    if (!options.regenerate) {
      const cached = await aiDraftRepo.getValidDraft(ticketId, context.messageCount);
      if (cached) {
        return {
          draft: cached.body,
          cached: true,
          model: cached.model,
          basedOnMessageCount: cached.basedOnMessageCount,
        };
      }
    }

    const result = await generateDraft(context);

    await aiDraftRepo.upsertDraft({
      ticketId: context.ticketId,
      body: result.draft,
      model: result.model,
      basedOnMessageCount: context.messageCount,
    });

    return {
      draft: result.draft,
      cached: false,
      model: result.model,
      basedOnMessageCount: context.messageCount,
    };
  },
};
