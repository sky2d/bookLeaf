import { withAuth } from "@/server/http/withAuth";
import { AppError } from "@/server/http/AppError";
import { AiUnavailableError } from "@/server/ai/client";
import { draftService } from "@/server/services/draftService";

export const maxDuration = 30;

type Params = { id: string };

/**
 * GET /api/admin/tickets/:id/draft — Retrieve an AI-drafted reply.
 * Returns cached draft if message count hasn't changed, or generates a fresh draft.
 * Supports `?regenerate=true` to force a new draft from Gemini.
 * ADMIN only.
 */
export const GET = withAuth<Params>(
  async (req, { params }) => {
    const url = new URL(req.url);
    const regenerate = url.searchParams.get("regenerate") === "true";

    try {
      const result = await draftService.getOrGenerateDraft(params.id, { regenerate });
      return Response.json(result);
    } catch (err) {
      if (err instanceof AiUnavailableError) {
        throw AppError.serviceUnavailable("AI_UNAVAILABLE", err.message);
      }
      throw err;
    }
  },
  { roles: ["ADMIN"] },
);
