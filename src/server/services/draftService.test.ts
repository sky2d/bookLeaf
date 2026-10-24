import { beforeEach, describe, expect, it, vi } from "vitest";
import { draftService } from "./draftService";
import { buildDraftContext } from "@/server/ai/contextBuilder";
import { generateDraft } from "@/server/ai/drafter";
import { aiDraftRepo } from "@/server/repositories/aiDraftRepo";

vi.mock("@/server/ai/contextBuilder", () => ({
  buildDraftContext: vi.fn(),
}));

vi.mock("@/server/ai/drafter", () => ({
  generateDraft: vi.fn(),
}));

vi.mock("@/server/repositories/aiDraftRepo", () => ({
  aiDraftRepo: {
    getValidDraft: vi.fn(),
    upsertDraft: vi.fn(),
    deleteDraft: vi.fn(),
  },
}));

describe("draftService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockContext = {
    ticketId: "cmvm123",
    authorName: "Priya Sharma",
    prompt: "Sample prompt text",
    systemInstruction: "Sample system instruction",
    category: "ROYALTY_PAYMENTS" as const,
    messageCount: 2,
  };

  it("serves cached draft when available and fresh without invoking LLM", async () => {
    vi.mocked(buildDraftContext).mockResolvedValueOnce(mockContext);
    vi.mocked(aiDraftRepo.getValidDraft).mockResolvedValueOnce({
      ticketId: "cmvm123",
      body: "Cached draft response",
      model: "gemini-3.5-flash",
      basedOnMessageCount: 2,
      createdAt: new Date(),
    });

    const result = await draftService.getOrGenerateDraft("cmvm123");

    expect(result.cached).toBe(true);
    expect(result.draft).toBe("Cached draft response");
    expect(result.model).toBe("gemini-3.5-flash");
    expect(result.basedOnMessageCount).toBe(2);

    expect(generateDraft).not.toHaveBeenCalled();
    expect(aiDraftRepo.upsertDraft).not.toHaveBeenCalled();
  });

  it("calls generateDraft and updates cache when no valid cached draft exists", async () => {
    vi.mocked(buildDraftContext).mockResolvedValueOnce(mockContext);
    vi.mocked(aiDraftRepo.getValidDraft).mockResolvedValueOnce(null);
    vi.mocked(generateDraft).mockResolvedValueOnce({
      draft: "Newly generated draft response",
      model: "gemini-3.5-flash",
      latencyMs: 1200,
    });

    const result = await draftService.getOrGenerateDraft("cmvm123");

    expect(result.cached).toBe(false);
    expect(result.draft).toBe("Newly generated draft response");
    expect(result.model).toBe("gemini-3.5-flash");
    expect(result.basedOnMessageCount).toBe(2);

    expect(generateDraft).toHaveBeenCalledWith(mockContext);
    expect(aiDraftRepo.upsertDraft).toHaveBeenCalledWith({
      ticketId: "cmvm123",
      body: "Newly generated draft response",
      model: "gemini-3.5-flash",
      basedOnMessageCount: 2,
    });
  });

  it("bypasses cache and generates fresh draft when regenerate: true is passed", async () => {
    vi.mocked(buildDraftContext).mockResolvedValueOnce(mockContext);
    vi.mocked(generateDraft).mockResolvedValueOnce({
      draft: "Regenerated draft response",
      model: "gemini-3.5-flash",
      latencyMs: 950,
    });

    const result = await draftService.getOrGenerateDraft("cmvm123", { regenerate: true });

    expect(result.cached).toBe(false);
    expect(result.draft).toBe("Regenerated draft response");

    // Cache check was skipped
    expect(aiDraftRepo.getValidDraft).not.toHaveBeenCalled();
    expect(generateDraft).toHaveBeenCalledWith(mockContext);
    expect(aiDraftRepo.upsertDraft).toHaveBeenCalledWith({
      ticketId: "cmvm123",
      body: "Regenerated draft response",
      model: "gemini-3.5-flash",
      basedOnMessageCount: 2,
    });
  });
});
