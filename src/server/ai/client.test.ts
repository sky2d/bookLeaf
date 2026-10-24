import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  AiUnavailableError,
  generateWithRetry,
  getDefaultModel,
  getGeminiClient,
  isAiEnabled,
  isRetryableError,
} from "./client";

const originalEnv = process.env;

describe("ai/client environment & initialization", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("reports disabled when GEMINI_API_KEY is missing", () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.AI_FORCE_FAIL;
    expect(isAiEnabled()).toBe(false);
    expect(() => getGeminiClient()).toThrow(AiUnavailableError);
  });

  it("reports disabled when AI_FORCE_FAIL is 'true'", () => {
    process.env.GEMINI_API_KEY = "test-key-xyz";
    process.env.AI_FORCE_FAIL = "true";
    expect(isAiEnabled()).toBe(false);
    expect(() => getGeminiClient()).toThrow(AiUnavailableError);
  });

  it("reports enabled when valid GEMINI_API_KEY is present and AI_FORCE_FAIL is not true", () => {
    process.env.GEMINI_API_KEY = "test-key-xyz";
    delete process.env.AI_FORCE_FAIL;
    expect(isAiEnabled()).toBe(true);
    const client = getGeminiClient();
    expect(client).toBeDefined();
  });

  it("resolves default model to GEMINI_MODEL env or gemini-3.5-flash", () => {
    delete process.env.GEMINI_MODEL;
    expect(getDefaultModel()).toBe("gemini-3.5-flash");

    process.env.GEMINI_MODEL = "gemini-1.5-pro";
    expect(getDefaultModel()).toBe("gemini-1.5-pro");
  });
});

describe("ai/client.isRetryableError", () => {
  it("identifies rate limit and server errors as retryable", () => {
    expect(isRetryableError({ status: 429 })).toBe(true);
    expect(isRetryableError({ status: 500 })).toBe(true);
    expect(isRetryableError({ status: 503 })).toBe(true);
    expect(isRetryableError(new Error("RESOURCE_EXHAUSTED: Quota exceeded"))).toBe(true);
    expect(isRetryableError({ name: "TimeoutError", message: "AI request timed out" })).toBe(true);
  });

  it("identifies client errors as non-retryable (fast fail)", () => {
    expect(isRetryableError({ status: 400 })).toBe(false);
    expect(isRetryableError({ status: 401 })).toBe(false);
    expect(isRetryableError({ status: 403 })).toBe(false);
    expect(isRetryableError({ status: 404 })).toBe(false);
    expect(isRetryableError(new Error("INVALID_ARGUMENT: Bad JSON syntax"))).toBe(false);
    expect(isRetryableError(new Error("PERMISSION_DENIED"))).toBe(false);
  });
});

describe("ai/client.generateWithRetry", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.GEMINI_API_KEY = "test-key-xyz";
    delete process.env.AI_FORCE_FAIL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns immediately on success", async () => {
    const fn = vi.fn().mockResolvedValueOnce("Generated Output");
    const result = await generateWithRetry(fn, { maxRetries: 2, initialDelayMs: 0 });

    expect(result).toBe("Generated Output");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on retryable error and succeeds on subsequent attempt", async () => {
    const error429 = Object.assign(new Error("Rate limit exceeded"), { status: 429 });
    const fn = vi
      .fn()
      .mockRejectedValueOnce(error429)
      .mockResolvedValueOnce("Recovered response");

    const result = await generateWithRetry(fn, { maxRetries: 2, initialDelayMs: 0 });

    expect(result).toBe("Recovered response");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("fails fast without retry on non-retryable 400 error", async () => {
    const error400 = Object.assign(new Error("Invalid prompt arguments"), { status: 400 });
    const fn = vi.fn().mockRejectedValue(error400);

    await expect(
      generateWithRetry(fn, { maxRetries: 2, initialDelayMs: 0 }),
    ).rejects.toThrow(AiUnavailableError);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries up to maxRetries on persistent 500 error then throws AiUnavailableError", async () => {
    const error500 = Object.assign(new Error("Internal service error"), { status: 500 });
    const fn = vi.fn().mockRejectedValue(error500);

    await expect(
      generateWithRetry(fn, { maxRetries: 2, initialDelayMs: 0 }),
    ).rejects.toThrow(AiUnavailableError);

    expect(fn).toHaveBeenCalledTimes(3); // Initial attempt + 2 retries
  });

  it("handles timeout correctly", async () => {
    const hangingFn = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(resolve, 500);
        }),
    );

    await expect(
      generateWithRetry(hangingFn, { timeoutMs: 50, maxRetries: 1, initialDelayMs: 0 }),
    ).rejects.toThrow(/timed out/i);

    expect(hangingFn).toHaveBeenCalledTimes(2); // Initial attempt + 1 retry
  });

  it("fails immediately when AI_FORCE_FAIL is enabled", async () => {
    process.env.AI_FORCE_FAIL = "true";
    const fn = vi.fn();

    await expect(generateWithRetry(fn)).rejects.toThrow(AiUnavailableError);
    expect(fn).not.toHaveBeenCalled();
  });
});
