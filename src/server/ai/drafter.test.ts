import { describe, expect, it, vi, beforeEach } from "vitest";
import { generateDraft } from "./drafter";
import { generateWithRetry } from "@/server/ai/client";
import { logAiCall } from "@/server/ai/usage";

vi.mock("@/server/ai/client", () => ({
  generateWithRetry: vi.fn(),
  getDefaultModel: vi.fn(() => "gemini-3.5-flash"),
  isAiEnabled: vi.fn(() => true),
  AiUnavailableError: class AiUnavailableError extends Error {
    constructor(reason: string) {
      super(`AI service unavailable: ${reason}`);
      this.name = "AiUnavailableError";
    }
  },
}));

vi.mock("@/server/ai/usage", () => ({
  logAiCall: vi.fn(),
}));

describe("drafter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockContext = {
    ticketId: "cmvm123",
    authorName: "Priya Sharma",
    prompt: "Sample prompt text",
    systemInstruction: "Sample system instruction",
    category: "ROYALTY_PAYMENTS" as const,
    messageCount: 1,
  };

  it("generates a draft using temperature 0.2 and logs telemetry", async () => {
    const mockGenerateContent = vi.fn().mockResolvedValueOnce({
      text: "Dear Priya,\n\nThank you for reaching out regarding your royalties...",
      usageMetadata: {
        promptTokenCount: 350,
        candidatesTokenCount: 150,
      },
    });

    const mockAi = {
      models: {
        generateContent: mockGenerateContent,
      },
    };

    vi.mocked(generateWithRetry).mockImplementationOnce(
      ((fn: (client: unknown) => unknown) => fn(mockAi)) as never,
    );

    const result = await generateDraft(mockContext);

    expect(result.draft).toContain("Dear Priya");
    expect(result.model).toBe("gemini-3.5-flash");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);

    expect(mockGenerateContent).toHaveBeenCalledWith({
      model: "gemini-3.5-flash",
      contents: "Sample prompt text",
      config: {
        systemInstruction: "Sample system instruction",
        temperature: 0.2,
        maxOutputTokens: 1500,
      },
    });

    expect(logAiCall).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketId: "cmvm123",
        purpose: "DRAFT",
        model: "gemini-3.5-flash",
        inputTokens: 350,
        outputTokens: 150,
        ok: true,
      }),
    );
  });

  it("throws AiUnavailableError and logs failure telemetry when model throws", async () => {
    vi.mocked(generateWithRetry).mockRejectedValueOnce(new Error("Rate limit exceeded 429"));

    await expect(generateDraft(mockContext)).rejects.toThrow("AI draft generation failed");

    expect(logAiCall).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketId: "cmvm123",
        purpose: "DRAFT",
        model: "gemini-3.5-flash",
        ok: false,
        errorCode: "Rate limit exceeded 429",
      }),
    );
  });
});
