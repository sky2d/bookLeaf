import { describe, expect, it, vi, beforeEach } from "vitest";
import { triageTicket } from "./triageService";
import { ticketRepo } from "@/server/repositories/ticketRepo";
import { classifyTicket } from "@/server/ai/classifier";
import { isAiEnabled } from "@/server/ai/client";
import { notifyTicketUpdated } from "@/server/realtime/broadcast";

vi.mock("@/server/repositories/ticketRepo", () => ({
  ticketRepo: {
    findByIdForAdmin: vi.fn(),
    updateTriage: vi.fn(),
  },
  PRIORITY_RANKS: {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  },
}));

vi.mock("@/server/ai/classifier", () => ({
  classifyTicket: vi.fn(),
}));

vi.mock("@/server/ai/client", () => ({
  isAiEnabled: vi.fn(),
}));

vi.mock("@/server/realtime/broadcast", () => ({
  notifyTicketUpdated: vi.fn().mockResolvedValue(undefined),
}));

describe("triageService.triageTicket", () => {
  const mockTicket = {
    id: "cmvm111",
    authorId: "AUTH001",
    subject: "My royalty has not arrived",
    description: "I am expecting payment for my sales",
    author: {
      name: "Priya Sharma",
      email: "priya@email.com",
    },
    book: {
      title: "Whispers of the Ganges",
      isbn: "978-81-951234-0-1",
      status: "Published & Live",
      mrp: 399,
      copiesSold: 120,
      royaltyEarned: 4800,
      royaltyPaid: 2000,
      royaltyPending: 2800,
      lastPayoutDate: new Date("2026-08-15"),
      printPartner: "Repro India",
      availableOn: ["Amazon"],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws 404 when ticket is not found", async () => {
    vi.mocked(ticketRepo.findByIdForAdmin).mockResolvedValueOnce(null);

    await expect(triageTicket("non-existent")).rejects.toThrow("Ticket not found");
  });

  it("updates triage with AI source when Gemini succeeds", async () => {
    vi.mocked(ticketRepo.findByIdForAdmin).mockResolvedValueOnce(mockTicket as never);
    vi.mocked(isAiEnabled).mockReturnValue(true);
    vi.mocked(classifyTicket).mockResolvedValueOnce({
      category: "ROYALTY_PAYMENTS",
      priority: "HIGH",
      confidence: 0.95,
      reasoning: "Query regarding unpaid royalty balance exceeding threshold.",
    });

    const result = await triageTicket("cmvm111");

    expect(result.category).toBe("ROYALTY_PAYMENTS");
    expect(result.categorySource).toBe("AI");
    expect(result.priority).toBe("HIGH");
    expect(result.prioritySource).toBe("AI");
    expect(result.priorityRank).toBe(1);

    expect(ticketRepo.updateTriage).toHaveBeenCalledWith("cmvm111", {
      category: "ROYALTY_PAYMENTS",
      categorySource: "AI",
      priority: "HIGH",
      prioritySource: "AI",
      priorityRank: 1,
      aiConfidence: 0.95,
      aiReasoning: "Query regarding unpaid royalty balance exceeding threshold.",
    });

    expect(notifyTicketUpdated).toHaveBeenCalledWith("cmvm111", "AUTH001", "ticket.updated");
  });

  it("falls back to heuristics when AI throws an error", async () => {
    vi.mocked(ticketRepo.findByIdForAdmin).mockResolvedValueOnce(mockTicket as never);
    vi.mocked(isAiEnabled).mockReturnValue(true);
    vi.mocked(classifyTicket).mockRejectedValueOnce(new Error("Gemini service unavailable 503"));

    const result = await triageTicket("cmvm111");

    expect(result.category).toBe("ROYALTY_PAYMENTS");
    expect(result.categorySource).toBe("FALLBACK");
    expect(result.prioritySource).toBe("FALLBACK");
    expect(result.confidence).toBe(0.75);
    expect(result.reasoning).toContain("Heuristic fallback");

    expect(ticketRepo.updateTriage).toHaveBeenCalledWith(
      "cmvm111",
      expect.objectContaining({
        category: "ROYALTY_PAYMENTS",
        categorySource: "FALLBACK",
        prioritySource: "FALLBACK",
      }),
    );

    expect(notifyTicketUpdated).toHaveBeenCalledWith("cmvm111", "AUTH001", "ticket.updated");
  });

  it("uses heuristics directly when AI is disabled", async () => {
    vi.mocked(ticketRepo.findByIdForAdmin).mockResolvedValueOnce(mockTicket as never);
    vi.mocked(isAiEnabled).mockReturnValue(false);

    const result = await triageTicket("cmvm111");

    expect(result.categorySource).toBe("FALLBACK");
    expect(classifyTicket).not.toHaveBeenCalled();
    expect(ticketRepo.updateTriage).toHaveBeenCalledTimes(1);
    expect(notifyTicketUpdated).toHaveBeenCalledWith("cmvm111", "AUTH001", "ticket.updated");
  });
});
