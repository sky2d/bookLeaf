import "server-only";
import { db } from "@/server/db";
import type { AiPurpose } from "@/generated/prisma/enums";

export interface LogAiCallParams {
  ticketId?: string | null;
  purpose: AiPurpose;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  ok: boolean;
  errorCode?: string | null;
}

/**
 * Persists an AI telemetry record to the `AiCall` table.
 * Wrapped in try/catch to ensure telemetry failures never disrupt operational logic.
 */
export async function logAiCall(params: LogAiCallParams): Promise<void> {
  try {
    await db.aiCall.create({
      data: {
        ticketId: params.ticketId ?? null,
        purpose: params.purpose,
        model: params.model,
        inputTokens: Math.max(0, Math.round(params.inputTokens ?? 0)),
        outputTokens: Math.max(0, Math.round(params.outputTokens ?? 0)),
        latencyMs: Math.max(0, Math.round(params.latencyMs)),
        ok: params.ok,
        errorCode: params.errorCode ?? null,
      },
    });
  } catch (err) {
    // If foreign key constraint failed (e.g. ticket was deleted concurrently or in test cleanup),
    // retry logging telemetry with ticketId: null so token/cost tracking is preserved
    try {
      if (params.ticketId) {
        await db.aiCall.create({
          data: {
            ticketId: null,
            purpose: params.purpose,
            model: params.model,
            inputTokens: Math.max(0, Math.round(params.inputTokens ?? 0)),
            outputTokens: Math.max(0, Math.round(params.outputTokens ?? 0)),
            latencyMs: Math.max(0, Math.round(params.latencyMs)),
            ok: params.ok,
            errorCode: params.errorCode ? `${params.errorCode} (ticket deleted)` : null,
          },
        });
        return;
      }
    } catch {
      // Ignore fallback logging error
    }

    // Non-fatal telemetry failure - log error but do not throw
    console.error("[ai/usage] Failed to log AI call telemetry:", err instanceof Error ? err.message : err);
  }
}
