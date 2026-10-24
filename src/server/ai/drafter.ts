import "server-only";
import {
  AiUnavailableError,
  generateWithRetry,
  getDefaultModel,
  isAiEnabled,
} from "@/server/ai/client";
import { logAiCall } from "@/server/ai/usage";
import type { DraftContextResult } from "@/server/ai/contextBuilder";

export interface GenerateDraftResult {
  draft: string;
  model: string;
  latencyMs: number;
}

/**
 * Invokes Gemini to draft an author support response based on the compiled context.
 * Enforces temperature 0.2 for deterministic adherence to policy and calculated facts.
 * Logs execution metrics (tokens, latency, status) to the `AiCall` table.
 */
export async function generateDraft(context: DraftContextResult): Promise<GenerateDraftResult> {
  if (!isAiEnabled()) {
    throw new AiUnavailableError(
      process.env.AI_FORCE_FAIL === "true"
        ? "AI service is disabled via AI_FORCE_FAIL"
        : "GEMINI_API_KEY is not configured",
    );
  }

  const model = getDefaultModel();
  const startTime = Date.now();

  try {
    const response = await generateWithRetry(async (ai) => {
      return await ai.models.generateContent({
        model,
        contents: context.prompt,
        config: {
          systemInstruction: context.systemInstruction,
          temperature: 0.2,
          maxOutputTokens: 1500,
        },
      });
    });

    const latencyMs = Date.now() - startTime;
    const rawText = (response.text ?? "").trim();

    if (!rawText) {
      throw new Error("Gemini returned an empty response for draft generation");
    }

    await logAiCall({
      ticketId: context.ticketId,
      purpose: "DRAFT",
      model,
      inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      latencyMs,
      ok: true,
    });

    return {
      draft: rawText,
      model,
      latencyMs,
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const errorCode = err instanceof Error ? err.message : String(err);

    await logAiCall({
      ticketId: context.ticketId,
      purpose: "DRAFT",
      model,
      latencyMs,
      ok: false,
      errorCode,
    });

    if (err instanceof AiUnavailableError) {
      throw err;
    }

    throw new AiUnavailableError(
      `AI draft generation failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
