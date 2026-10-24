import "server-only";
import { GoogleGenAI } from "@google/genai";

export class AiUnavailableError extends Error {
  readonly statusCode: number;
  readonly reason: string;

  constructor(reason: string, statusCode = 503) {
    super(`AI service unavailable: ${reason}`);
    this.name = "AiUnavailableError";
    this.reason = reason;
    this.statusCode = statusCode;
  }
}

/** Check if AI capabilities are available and active */
export function isAiEnabled(): boolean {
  if (process.env.AI_FORCE_FAIL === "true") {
    return false;
  }
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
}

/** Default Gemini model for text operations */
export function getDefaultModel(): string {
  return process.env.GEMINI_MODEL || "gemini-3.5-flash";
}

let cachedClient: GoogleGenAI | null = null;
let cachedKey: string | null = null;

/**
 * Returns a configured GoogleGenAI instance.
 * Throws AiUnavailableError if AI is disabled or unconfigured.
 */
export function getGeminiClient(): GoogleGenAI {
  if (!isAiEnabled()) {
    const reason =
      process.env.AI_FORCE_FAIL === "true"
        ? "AI service is disabled (AI_FORCE_FAIL is enabled)"
        : "AI service is not configured (missing GEMINI_API_KEY)";
    throw new AiUnavailableError(reason);
  }

  const key = process.env.GEMINI_API_KEY!;
  if (cachedClient && cachedKey === key) {
    return cachedClient;
  }

  cachedClient = new GoogleGenAI({ apiKey: key });
  cachedKey = key;
  return cachedClient;
}

export function isRetryableError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;

  const error = err as Record<string, unknown>;

  if (error.name === "TimeoutError" || String(error.message).toLowerCase().includes("timed out")) {
    return true;
  }

  const status =
    typeof error.status === "number"
      ? error.status
      : typeof error.statusCode === "number"
        ? error.statusCode
        : undefined;

  if (typeof status === "number") {
    if (status === 429) return true;
    if (status >= 500 && status < 600) return true;
    if (status >= 400 && status < 500) return false;
  }

  const msg = String(error.message || "");
  if (/429|RESOURCE_EXHAUSTED|rate limit|quota/i.test(msg)) return true;
  if (/500|502|503|504|INTERNAL|UNAVAILABLE|DEADLINE_EXCEEDED/i.test(msg)) return true;
  if (/400|INVALID_ARGUMENT|401|UNAUTHENTICATED|403|PERMISSION_DENIED|404|NOT_FOUND/i.test(msg)) {
    return false;
  }

  return false;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`AI request timed out after ${ms}ms`);
      err.name = "TimeoutError";
      reject(err);
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export interface RetryOptions {
  timeoutMs?: number;
  maxRetries?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
}

/**
 * Executes an AI operation with a timeout and exponential backoff retry for transient errors.
 * - Retries transient failures (429, 5xx, timeouts) up to maxRetries.
 * - Fast-fails on client errors (400, 401, 403).
 * - Wraps unexpected or terminal errors into AiUnavailableError.
 */
export async function generateWithRetry<T>(
  fn: (ai: GoogleGenAI) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    timeoutMs = 10_000,
    maxRetries = 2,
    initialDelayMs = 500,
    backoffFactor = 2,
  } = options;

  const client = getGeminiClient();

  let attempt = 0;
  while (true) {
    try {
      return await withTimeout(fn(client), timeoutMs);
    } catch (err) {
      const retryable = isRetryableError(err);
      if (!retryable || attempt >= maxRetries) {
        if (err instanceof AiUnavailableError) {
          throw err;
        }
        const message = err instanceof Error ? err.message : String(err);
        const status =
          err && typeof err === "object" && "status" in err && typeof (err as { status?: unknown }).status === "number"
            ? (err as { status: number }).status
            : 503;
        throw new AiUnavailableError(message, status);
      }

      const delay = initialDelayMs * Math.pow(backoffFactor, attempt);
      attempt++;
      if (delay > 0) {
        await sleep(delay);
      }
    }
  }
}
