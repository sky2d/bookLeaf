import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/server/http/AppError";

const findOwned = vi.fn();
vi.mock("@/server/repositories/bookRepo", () => ({
  bookRepo: {
    findOwned: (authorId: string, bookId: string) => findOwned(authorId, bookId),
  },
}));

const createTicket = vi.fn();
vi.mock("@/server/repositories/ticketRepo", () => ({
  ticketRepo: {
    create: (data: unknown) => createTicket(data),
  },
}));

const { ticketService, toTicketSummaryDto } = await import("./ticketService");

describe("toTicketSummaryDto", () => {
  it("formats ticket and date ISO strings", () => {
    const dto = toTicketSummaryDto({
      id: "TCK001",
      subject: "Test subject",
      status: "OPEN",
      createdAt: new Date("2026-10-24T10:00:00.000Z"),
      updatedAt: new Date("2026-10-24T10:00:00.000Z"),
      book: { id: "BK001", title: "Test Book" },
    });

    expect(dto).toEqual({
      id: "TCK001",
      subject: "Test subject",
      status: "OPEN",
      createdAt: "2026-10-24T10:00:00.000Z",
      updatedAt: "2026-10-24T10:00:00.000Z",
      book: { id: "BK001", title: "Test Book" },
    });
  });

  it("handles general tickets with null book", () => {
    const dto = toTicketSummaryDto({
      id: "TCK002",
      subject: "General query",
      status: "OPEN",
      createdAt: new Date("2026-10-24T10:00:00.000Z"),
      updatedAt: new Date("2026-10-24T10:00:00.000Z"),
      book: null,
    });

    expect(dto.book).toBeNull();
  });
});

describe("ticketService.create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a general ticket when bookId is null", async () => {
    createTicket.mockResolvedValueOnce({
      id: "TCK003",
      authorId: "AUTH001",
      bookId: null,
      subject: "General account question",
      description: "My profile needs an updated phone number.",
      attachmentName: null,
      status: "OPEN",
      priorityRank: 1,
      createdAt: new Date("2026-10-24T10:00:00.000Z"),
      updatedAt: new Date("2026-10-24T10:00:00.000Z"),
      book: null,
    });

    const result = await ticketService.create("AUTH001", {
      subject: "General account question",
      description: "My profile needs an updated phone number.",
      bookId: null,
      attachmentName: null,
    });

    expect(findOwned).not.toHaveBeenCalled();
    expect(createTicket).toHaveBeenCalledWith({
      authorId: "AUTH001",
      bookId: null,
      subject: "General account question",
      description: "My profile needs an updated phone number.",
      attachmentName: null,
    });
    expect(result.id).toBe("TCK003");
    expect(result.book).toBeNull();
  });

  it("creates a ticket when the referenced book belongs to the author", async () => {
    findOwned.mockResolvedValueOnce({
      id: "BK001",
      authorId: "AUTH001",
      title: "The Forest of Chimes",
    });

    createTicket.mockResolvedValueOnce({
      id: "TCK004",
      authorId: "AUTH001",
      bookId: "BK001",
      subject: "Question about royalty",
      description: "When is the next statement being released?",
      attachmentName: "receipt.pdf",
      status: "OPEN",
      priorityRank: 1,
      createdAt: new Date("2026-10-24T10:00:00.000Z"),
      updatedAt: new Date("2026-10-24T10:00:00.000Z"),
      book: { id: "BK001", title: "The Forest of Chimes" },
    });

    const result = await ticketService.create("AUTH001", {
      subject: "Question about royalty",
      description: "When is the next statement being released?",
      bookId: "BK001",
      attachmentName: "receipt.pdf",
    });

    expect(findOwned).toHaveBeenCalledWith("AUTH001", "BK001");
    expect(createTicket).toHaveBeenCalledWith({
      authorId: "AUTH001",
      bookId: "BK001",
      subject: "Question about royalty",
      description: "When is the next statement being released?",
      attachmentName: "receipt.pdf",
    });
    expect(result.id).toBe("TCK004");
    expect(result.book?.title).toBe("The Forest of Chimes");
  });

  it("throws AppError.notFound (404) if book is not owned by the author", async () => {
    findOwned.mockResolvedValueOnce(null);

    await expect(
      ticketService.create("AUTH001", {
        subject: "Question about foreign book",
        description: "Checking details on another book.",
        bookId: "BK999",
        attachmentName: null,
      }),
    ).rejects.toThrowError(AppError);

    expect(findOwned).toHaveBeenCalledWith("AUTH001", "BK999");
    expect(createTicket).not.toHaveBeenCalled();
  });
});
