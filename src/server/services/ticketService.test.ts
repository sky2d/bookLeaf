import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/server/http/AppError";

const findOwned = vi.fn();
vi.mock("@/server/repositories/bookRepo", () => ({
  bookRepo: {
    findOwned: (authorId: string, bookId: string) => findOwned(authorId, bookId),
  },
}));

const createTicket = vi.fn();
const listByAuthor = vi.fn();
const findByIdForAuthor = vi.fn();
const addMessage = vi.fn();
const addMessageAndReopen = vi.fn();
vi.mock("@/server/repositories/ticketRepo", () => ({
  ticketRepo: {
    create: (data: unknown) => createTicket(data),
    listByAuthor: (authorId: string) => listByAuthor(authorId),
    findByIdForAuthor: (id: string, authorId: string) => findByIdForAuthor(id, authorId),
    addMessage: (tId: string, sId: string, role: string, body: string) => addMessage(tId, sId, role, body),
    addMessageAndReopen: (tId: string, sId: string, role: string, body: string) =>
      addMessageAndReopen(tId, sId, role, body),
  },
}));

const { ticketService, toAuthorTicketDto, toTicketSummaryDto } = await import("./ticketService");

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

describe("toAuthorTicketDto", () => {
  it("strictly enforces author DTO fields and never leaks internal/AI fields", () => {
    const rawData = {
      id: "TCK001",
      subject: "Test subject",
      description: "Detailed query text here.",
      status: "OPEN" as const,
      attachmentName: "file.pdf",
      createdAt: new Date("2026-10-24T10:00:00.000Z"),
      updatedAt: new Date("2026-10-24T10:00:00.000Z"),
      resolvedAt: null,
      book: { id: "BK001", title: "Whispers of the Ganges" },
      messages: [
        {
          id: "MSG001",
          body: "We are reviewing your request.",
          senderRole: "ADMIN" as const,
          createdAt: new Date("2026-10-24T10:30:00.000Z"),
          sender: { id: "USR_ADM", name: "Admin User", role: "ADMIN" as const },
        },
      ],
      // Simulated internal fields that might exist on a database row
      notes: [{ id: "NOTE1", body: "Customer called 3 times." }],
      aiConfidence: 0.95,
      aiReasoning: "Matched royalty policy section 3",
      categorySource: "AI",
      prioritySource: "AI",
      priorityRank: 1,
      aiDraft: { body: "Draft message" },
    };

    const dto = toAuthorTicketDto(rawData);

    // Exact allowable keys on AuthorTicketDto
    const expectedKeys = [
      "id",
      "subject",
      "description",
      "status",
      "attachmentName",
      "createdAt",
      "updatedAt",
      "resolvedAt",
      "book",
      "messages",
    ].sort();

    expect(Object.keys(dto).sort()).toEqual(expectedKeys);

    // Explicitly verify sensitive/internal fields are NOT present
    const disallowedFields = [
      "notes",
      "aiConfidence",
      "aiReasoning",
      "categorySource",
      "prioritySource",
      "priorityRank",
      "aiDraft",
      "usedAiDraft",
    ];
    for (const field of disallowedFields) {
      expect(dto).not.toHaveProperty(field);
    }

    // Verify admin sender name is mapped to "Team BookLeaf"
    expect(dto.messages[0]?.senderName).toBe("Team BookLeaf");
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

describe("ticketService.listForAuthor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries tickets by authorId and maps to summary DTOs", async () => {
    listByAuthor.mockResolvedValueOnce([
      {
        id: "TCK100",
        subject: "Recent ticket",
        status: "OPEN",
        createdAt: new Date("2026-10-24T10:00:00.000Z"),
        updatedAt: new Date("2026-10-24T11:00:00.000Z"),
        book: { id: "BK001", title: "Whispers of the Ganges" },
      },
    ]);

    const result = await ticketService.listForAuthor("AUTH001");
    expect(listByAuthor).toHaveBeenCalledWith("AUTH001");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("TCK100");
    expect(result[0].updatedAt).toBe("2026-10-24T11:00:00.000Z");
    expect(result[0].book?.title).toBe("Whispers of the Ganges");
  });
});

describe("ticketService.getForAuthor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ticket detail when author owns the ticket", async () => {
    findByIdForAuthor.mockResolvedValueOnce({
      id: "TCK010",
      subject: "My ticket",
      description: "Details here",
      status: "OPEN",
      attachmentName: null,
      createdAt: new Date("2026-10-24T10:00:00.000Z"),
      updatedAt: new Date("2026-10-24T10:00:00.000Z"),
      resolvedAt: null,
      book: null,
      messages: [],
    });

    const ticket = await ticketService.getForAuthor("TCK010", "AUTH001");
    expect(findByIdForAuthor).toHaveBeenCalledWith("TCK010", "AUTH001");
    expect(ticket.id).toBe("TCK010");
  });

  it("throws AppError.notFound (404) when ticket does not belong to author", async () => {
    findByIdForAuthor.mockResolvedValueOnce(null);

    await expect(ticketService.getForAuthor("TCK999", "AUTH001")).rejects.toThrowError(AppError);
    expect(findByIdForAuthor).toHaveBeenCalledWith("TCK999", "AUTH001");
  });
});

describe("ticketService.addAuthorMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds message to an OPEN ticket without reopening", async () => {
    findByIdForAuthor.mockResolvedValueOnce({
      id: "TCK020",
      authorId: "AUTH001",
      status: "OPEN",
    });

    addMessage.mockResolvedValueOnce({
      id: "MSG010",
      ticketId: "TCK020",
      body: "Additional details provided.",
      senderRole: "AUTHOR",
      createdAt: new Date("2026-10-24T11:00:00.000Z"),
      sender: { id: "USR001", name: "Priya Sharma", role: "AUTHOR" },
    });

    const msg = await ticketService.addAuthorMessage("TCK020", "AUTH001", "USR001", {
      body: "Additional details provided.",
    });

    expect(addMessage).toHaveBeenCalledWith("TCK020", "USR001", "AUTHOR", "Additional details provided.");
    expect(addMessageAndReopen).not.toHaveBeenCalled();
    expect(msg.body).toBe("Additional details provided.");
    expect(msg.senderName).toBe("Priya Sharma");
  });

  it("reopens a RESOLVED ticket to OPEN when author replies", async () => {
    findByIdForAuthor.mockResolvedValueOnce({
      id: "TCK021",
      authorId: "AUTH001",
      status: "RESOLVED",
    });

    addMessageAndReopen.mockResolvedValueOnce({
      id: "MSG011",
      ticketId: "TCK021",
      body: "Issue reoccurred.",
      senderRole: "AUTHOR",
      createdAt: new Date("2026-10-24T11:00:00.000Z"),
      sender: { id: "USR001", name: "Priya Sharma", role: "AUTHOR" },
    });

    const msg = await ticketService.addAuthorMessage("TCK021", "AUTH001", "USR001", {
      body: "Issue reoccurred.",
    });

    expect(addMessageAndReopen).toHaveBeenCalledWith("TCK021", "USR001", "AUTHOR", "Issue reoccurred.");
    expect(addMessage).not.toHaveBeenCalled();
    expect(msg.id).toBe("MSG011");
  });

  it("throws 409 CONFLICT when trying to reply to a CLOSED ticket", async () => {
    findByIdForAuthor.mockResolvedValueOnce({
      id: "TCK022",
      authorId: "AUTH001",
      status: "CLOSED",
    });

    await expect(
      ticketService.addAuthorMessage("TCK022", "AUTH001", "USR001", {
        body: "Attempting reply on closed ticket",
      }),
    ).rejects.toThrowError(AppError);

    expect(addMessage).not.toHaveBeenCalled();
    expect(addMessageAndReopen).not.toHaveBeenCalled();
  });

  it("throws 404 NOT_FOUND when ticket does not belong to author", async () => {
    findByIdForAuthor.mockResolvedValueOnce(null);

    await expect(
      ticketService.addAuthorMessage("TCK999", "AUTH001", "USR001", {
        body: "Attempting reply on foreign ticket",
      }),
    ).rejects.toThrowError(AppError);

    expect(addMessage).not.toHaveBeenCalled();
    expect(addMessageAndReopen).not.toHaveBeenCalled();
  });
});
