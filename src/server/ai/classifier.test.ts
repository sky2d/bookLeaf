import { describe, expect, it, vi, beforeEach } from "vitest";
import { classifyTicket } from "./classifier";
import * as clientModule from "./client";
import * as usageModule from "./usage";

vi.mock("./client", async () => {
  const actual = await vi.importActual<typeof import("./client")>("./client");
  return {
    ...actual,
    isAiEnabled: vi.fn(),
    getDefaultModel: vi.fn().mockReturnValue("gemini-3.5-flash"),
    generateWithRetry: vi.fn(),
  };
});

vi.mock("./usage", () => ({
  logAiCall: vi.fn().mockResolvedValue(undefined),
}));

describe("ai/classifier.classifyTicket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws AiUnavailableError immediately when AI is disabled", async () => {
    vi.mocked(clientModule.isAiEnabled).mockReturnValue(false);

    await expect(
      classifyTicket({
        authorName: "Priya Sharma",
        subject: "Royalty issue",
        description: "Payment missing",
      }),
    ).rejects.toThrow(clientModule.AiUnavailableError);

    expect(clientModule.generateWithRetry).not.toHaveBeenCalled();
    expect(usageModule.logAiCall).not.toHaveBeenCalled();
  });

  it("parses valid JSON response and logs telemetry on success", async () => {
    vi.mocked(clientModule.isAiEnabled).mockReturnValue(true);
    vi.mocked(clientModule.generateWithRetry).mockImplementation(async (fn) => {
      const mockAi = {
        models: {
          generateContent: vi.fn().mockResolvedValue({
            text: JSON.stringify({
              category: "ROYALTY_PAYMENTS",
              priority: "HIGH",
              confidence: 0.94,
              reasoning: "Author inquires about unpaid royalties exceeding the payout threshold.",
            }),
            usageMetadata: {
              promptTokenCount: 140,
              candidatesTokenCount: 35,
              totalTokenCount: 175,
            },
          }),
        },
      };
      return fn(mockAi as never);
    });

    const result = await classifyTicket({
      ticketId: "cmvm123456",
      authorName: "Ananya Reddy",
      authorEmail: "ananya@email.com",
      subject: "Royalty payment not received",
      description: "My royalties for Q3 haven't arrived in my bank account yet.",
    });

    expect(result.category).toBe("ROYALTY_PAYMENTS");
    expect(result.priority).toBe("HIGH");
    expect(result.confidence).toBe(0.94);
    expect(result.reasoning).toContain("unpaid royalties");

    expect(usageModule.logAiCall).toHaveBeenCalledTimes(1);
    expect(usageModule.logAiCall).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketId: "cmvm123456",
        purpose: "CLASSIFY",
        model: "gemini-3.5-flash",
        inputTokens: 140,
        outputTokens: 35,
        ok: true,
      }),
    );
  });

  it("throws and logs failure telemetry when model returns malformed JSON", async () => {
    vi.mocked(clientModule.isAiEnabled).mockReturnValue(true);
    vi.mocked(clientModule.generateWithRetry).mockImplementation(async (fn) => {
      const mockAi = {
        models: {
          generateContent: vi.fn().mockResolvedValue({
            text: "NOT_VALID_JSON",
            usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 10 },
          }),
        },
      };
      return fn(mockAi as never);
    });

    await expect(
      classifyTicket({
        ticketId: "cmvm999",
        authorName: "Rahul",
        subject: "Help",
        description: "Something is wrong",
      }),
    ).rejects.toThrow(/Failed to parse structured JSON/);

    expect(usageModule.logAiCall).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketId: "cmvm999",
        purpose: "CLASSIFY",
        ok: false,
        errorCode: expect.stringContaining("Failed to parse structured JSON"),
      }),
    );
  });

  it("handles upstream model error and logs error telemetry", async () => {
    vi.mocked(clientModule.isAiEnabled).mockReturnValue(true);
    vi.mocked(clientModule.generateWithRetry).mockRejectedValueOnce(
      new clientModule.AiUnavailableError("Upstream service unavailable (503)"),
    );

    await expect(
      classifyTicket({
        ticketId: "cmvm888",
        authorName: "Rahul",
        subject: "Help",
        description: "Something is wrong",
      }),
    ).rejects.toThrow(/Upstream service unavailable/);

    expect(usageModule.logAiCall).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketId: "cmvm888",
        purpose: "CLASSIFY",
        ok: false,
        errorCode: expect.stringContaining("Upstream service unavailable"),
      }),
    );
  });
});
