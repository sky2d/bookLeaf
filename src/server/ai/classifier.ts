import "server-only";
import { generateWithRetry, getDefaultModel, isAiEnabled, AiUnavailableError } from "./client";
import {
  buildClassifyPrompt,
  CLASSIFICATION_SYSTEM_INSTRUCTION,
  classificationResultSchema,
  type ClassificationResult,
} from "./prompts/classify";
import { logAiCall } from "./usage";

export interface ClassifyTicketInput {
  ticketId?: string | null;
  authorName: string;
  authorEmail?: string;
  subject: string;
  description: string;
  bookFacts?: string | null;
}

/**
 * Invokes Gemini 3.5 Flash to categorize and prioritize a support ticket.
 * Uses strict JSON structured output (`responseMimeType: "application/json"`),
 * zero temperature, and validates the result via Zod.
 *
 * All executions record telemetry to the `AiCall` table.
 * Throws AiUnavailableError if AI is disabled or fails after all retries.
 */
export async function classifyTicket(input: ClassifyTicketInput): Promise<ClassificationResult> {
  if (!isAiEnabled()) {
    throw new AiUnavailableError("AI service is disabled or unconfigured");
  }

  const model = getDefaultModel();
  const prompt = buildClassifyPrompt({
    authorName: input.authorName,
    authorEmail: input.authorEmail,
    subject: input.subject,
    description: input.description,
    bookFacts: input.bookFacts,
  });

  const startTime = Date.now();

  try {
    const response = await generateWithRetry(async (ai) => {
      return await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: CLASSIFICATION_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          temperature: 0,
          maxOutputTokens: 1000,
        },
      });
    });

    const latencyMs = Date.now() - startTime;
    const rawText = response.text?.trim() || "";

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      throw new Error(`Failed to parse structured JSON from model: ${rawText}`);
    }

    const validated = classificationResultSchema.parse(parsedJson);

    await logAiCall({
      ticketId: input.ticketId ?? null,
      purpose: "CLASSIFY",
      model,
      inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      latencyMs,
      ok: true,
    });

    return validated;
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const errorCode = err instanceof Error ? err.message : String(err);

    await logAiCall({
      ticketId: input.ticketId ?? null,
      purpose: "CLASSIFY",
      model,
      latencyMs,
      ok: false,
      errorCode,
    });

    throw err;
  }
}
