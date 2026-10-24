import { describe, expect, it, vi } from "vitest";
import { buildDraftContext } from "./contextBuilder";
import { ticketRepo } from "@/server/repositories/ticketRepo";

vi.mock("@/server/repositories/ticketRepo", () => ({
  ticketRepo: {
    findByIdForAdmin: vi.fn(),
  },
}));

describe("contextBuilder", () => {
  it("throws notFound AppError if ticket does not exist", async () => {
    vi.mocked(ticketRepo.findByIdForAdmin).mockResolvedValueOnce(null);

    await expect(buildDraftContext("nonexistent")).rejects.toThrow("Ticket not found.");
  });

  it("selects category-specific KB context and injects calculated facts", async () => {
    vi.mocked(ticketRepo.findByIdForAdmin).mockResolvedValueOnce({
      id: "cmvm123",
      authorId: "AUTH001",
      bookId: "BK001",
      subject: "Royalty missing for Q3",
      description: "I haven't received my Q3 royalties yet.",
      status: "OPEN",
      category: "ROYALTY_PAYMENTS",
      categorySource: "AI",
      priority: "HIGH",
      prioritySource: "AI",
      priorityRank: 1,
      aiConfidence: 0.95,
      aiReasoning: "Payment query",
      assigneeId: null,
      attachmentName: null,
      createdAt: new Date("2026-10-24T10:00:00.000Z"),
      updatedAt: new Date("2026-10-24T10:00:00.000Z"),
      resolvedAt: null,
      author: {
        id: "AUTH001",
        name: "Priya Sharma",
        email: "priya.sharma@email.com",
        phone: "+91 98765 43210",
        city: "Mumbai",
        joinedDate: new Date("2025-01-15"),
      },
      book: {
        id: "BK001",
        authorId: "AUTH001",
        title: "Whispers in the Wind",
        isbn: "978-93-12345-01-2",
        genre: "Fiction / Romance",
        publicationDate: new Date("2025-04-10"),
        status: "Published & Live",
        mrp: 299,
        royaltyPerCopy: 45,
        copiesSold: 120,
        royaltyEarned: 5400,
        royaltyPaid: 2854,
        royaltyPending: 2546,
        lastPayoutDate: new Date("2026-08-14"),
        printPartner: "Repro India",
        availableOn: ["Bookstore", "Amazon", "Flipkart"],
      },
      messages: [
        {
          id: "msg1",
          ticketId: "cmvm123",
          senderId: "user1",
          senderRole: "AUTHOR",
          body: "Any update on this?",
          usedAiDraft: false,
          createdAt: new Date("2026-10-24T11:00:00.000Z"),
          sender: { id: "user1", name: "Priya Sharma", role: "AUTHOR" },
        },
      ],
      notes: [],
      assignee: null,
    } as unknown as NonNullable<Awaited<ReturnType<typeof ticketRepo.findByIdForAdmin>>>);

    const result = await buildDraftContext("cmvm123");

    expect(result.ticketId).toBe("cmvm123");
    expect(result.authorName).toBe("Priya Sharma");
    expect(result.category).toBe("ROYALTY_PAYMENTS");
    expect(result.messageCount).toBe(1);

    // Prompt contains Royalty policy
    expect(result.prompt).toContain("Royalty & Payments Policy");
    // Prompt does NOT contain other irrelevant policies
    expect(result.prompt).not.toContain("Printing & Quality Assurance Policy");
    expect(result.prompt).not.toContain("ISBN & Metadata Policy");

    // Prompt contains calculated financial facts
    expect(result.prompt).toContain("Whispers in the Wind");
    expect(result.prompt).toContain("₹2,546");
    expect(result.prompt).toContain("Priya Sharma");

    // Prompt includes the conversation messages
    expect(result.prompt).toContain("I haven't received my Q3 royalties yet.");
    expect(result.prompt).toContain("Any update on this?");
  });

  it("limits conversation history to the last 6 messages", async () => {
    const messages = Array.from({ length: 10 }, (_, i) => ({
      id: `msg-${i}`,
      ticketId: "cmvm123",
      senderId: `user-${i}`,
      senderRole: i % 2 === 0 ? "AUTHOR" : "ADMIN",
      body: `Message index ${i}`,
      usedAiDraft: false,
      createdAt: new Date(`2026-10-24T1${i}:00:00.000Z`),
      sender: {
        id: `user-${i}`,
        name: i % 2 === 0 ? "Priya Sharma" : "Support Admin",
        role: i % 2 === 0 ? "AUTHOR" : "ADMIN",
      },
    }));

    vi.mocked(ticketRepo.findByIdForAdmin).mockResolvedValueOnce({
      id: "cmvm123",
      authorId: "AUTH001",
      bookId: null,
      subject: "General Question",
      description: "Initial message index -1",
      status: "IN_PROGRESS",
      category: "GENERAL_INQUIRY",
      categorySource: "MANUAL",
      priority: "LOW",
      prioritySource: "MANUAL",
      priorityRank: 3,
      aiConfidence: null,
      aiReasoning: null,
      assigneeId: null,
      attachmentName: null,
      createdAt: new Date("2026-10-24T09:00:00.000Z"),
      updatedAt: new Date("2026-10-24T19:00:00.000Z"),
      resolvedAt: null,
      author: {
        id: "AUTH001",
        name: "Priya Sharma",
        email: "priya.sharma@email.com",
        phone: "+91 98765 43210",
        city: "Mumbai",
        joinedDate: new Date("2025-01-15"),
      },
      book: null,
      messages,
      notes: [],
      assignee: null,
    } as unknown as NonNullable<Awaited<ReturnType<typeof ticketRepo.findByIdForAdmin>>>);

    const result = await buildDraftContext("cmvm123");

    // 10 messages + initial description = 11 total. Last 6 are messages 5, 6, 7, 8, 9, and the last one.
    // Early messages (index 0, 1, 2) should be excluded
    expect(result.prompt).not.toContain("Message index 0");
    expect(result.prompt).not.toContain("Message index 1");
    expect(result.prompt).not.toContain("Message index 2");

    // Late messages (index 7, 8, 9) should be present
    expect(result.prompt).toContain("Message index 8");
    expect(result.prompt).toContain("Message index 9");
  });
});
