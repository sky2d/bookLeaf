import { describe, expect, it, vi, beforeEach } from "vitest";
import { logAiCall } from "./usage";
import { db } from "@/server/db";

vi.mock("@/server/db", () => ({
  db: {
    aiCall: {
      create: vi.fn(),
    },
  },
}));

describe("ai/usage.logAiCall", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists valid AI telemetry record to db", async () => {
    vi.mocked(db.aiCall.create).mockResolvedValueOnce({} as never);

    await logAiCall({
      ticketId: "cmvm123456",
      purpose: "CLASSIFY",
      model: "gemini-2.5-flash",
      inputTokens: 150,
      outputTokens: 42,
      latencyMs: 320,
      ok: true,
    });

    expect(db.aiCall.create).toHaveBeenCalledTimes(1);
    expect(db.aiCall.create).toHaveBeenCalledWith({
      data: {
        ticketId: "cmvm123456",
        purpose: "CLASSIFY",
        model: "gemini-2.5-flash",
        inputTokens: 150,
        outputTokens: 42,
        latencyMs: 320,
        ok: true,
        errorCode: null,
      },
    });
  });

  it("defaults missing tokens and handles null ticketId", async () => {
    vi.mocked(db.aiCall.create).mockResolvedValueOnce({} as never);

    await logAiCall({
      purpose: "DRAFT",
      model: "gemini-2.5-flash",
      latencyMs: 500,
      ok: false,
      errorCode: "UNAVAILABLE",
    });

    expect(db.aiCall.create).toHaveBeenCalledWith({
      data: {
        ticketId: null,
        purpose: "DRAFT",
        model: "gemini-2.5-flash",
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: 500,
        ok: false,
        errorCode: "UNAVAILABLE",
      },
    });
  });

  it("catches and suppresses database errors without throwing", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(db.aiCall.create).mockRejectedValueOnce(new Error("Database connection timeout"));

    await expect(
      logAiCall({
        purpose: "CLASSIFY",
        model: "gemini-2.5-flash",
        latencyMs: 120,
        ok: false,
      }),
    ).resolves.not.toThrow();

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
