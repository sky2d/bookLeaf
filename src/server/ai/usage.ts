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
    // Non-fatal telemetry failure - log error but do not throw
    console.error("[ai/usage] Failed to log AI call telemetry:", err);
  }
}
