import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/server/http/AppError";

const findQueue = vi.fn();
const buildWhereClause = vi.fn();
const findByIdForAdmin = vi.fn();
const getAuthorOtherBooks = vi.fn();
const updateAdminTicket = vi.fn();
const addAdminReply = vi.fn();
const addInternalNote = vi.fn();

vi.mock("@/server/repositories/ticketRepo", () => ({
  ticketRepo: {
    findQueue: (opts: unknown) => findQueue(opts),
    buildWhereClause: (q: unknown, uId?: string) => buildWhereClause(q, uId),
    findByIdForAdmin: (id: string) => findByIdForAdmin(id),
    getAuthorOtherBooks: (aId: string, bId?: string | null) => getAuthorOtherBooks(aId, bId),
    updateAdminTicket: (id: string, data: unknown) => updateAdminTicket(id, data),
    addAdminReply: (tId: string, aId: string, body: string) => addAdminReply(tId, aId, body),
    addInternalNote: (tId: string, aId: string, body: string) => addInternalNote(tId, aId, body),
  },
}));

const { adminTicketService } = await import("./adminTicketService");

describe("adminTicketService.listQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists tickets and maps to AdminTicketDto with pagination metadata", async () => {
    const mockWhere = { status: { in: ["OPEN", "IN_PROGRESS"] } };
    buildWhereClause.mockReturnValueOnce(mockWhere);

    findQueue.mockResolvedValueOnce({
      tickets: [
        {
          id: "TCK001",
          subject: "Royalty issue",
          status: "OPEN",
          category: "ROYALTY_PAYMENTS",
          categorySource: "AI",
          priority: "CRITICAL",
          prioritySource: "AI",
          priorityRank: 0,
          aiConfidence: 0.95,
          aiReasoning: "Urgent payment issue",
          createdAt: new Date("2026-10-24T08:00:00.000Z"),
          updatedAt: new Date("2026-10-24T09:00:00.000Z"),
          author: {
            id: "AUTH001",
            name: "Priya Sharma",
            email: "priya.sharma@email.com",
          },
          book: {
            id: "BK001",
            title: "Whispers of the Ganges",
          },
          assignee: {
            id: "ADM001",
            name: "Support Lead",
          },
        },
      ],
      total: 1,
    });

    const query = {
      status: "UNRESOLVED" as const,
      page: 1,
      pageSize: 20,
    };

    const res = await adminTicketService.listQueue(query, "ADM001");

    expect(buildWhereClause).toHaveBeenCalledWith(query, "ADM001");
    expect(findQueue).toHaveBeenCalledWith({
      where: mockWhere,
      skip: 0,
      take: 20,
    });
    expect(res.tickets).toHaveLength(1);
    expect(res.tickets[0].id).toBe("TCK001");
  });

  it("handles null book and null assignee safely", async () => {
    buildWhereClause.mockReturnValueOnce({});
    findQueue.mockResolvedValueOnce({
      tickets: [
        {
          id: "TCK002",
          subject: "General account inquiry",
          status: "OPEN",
          category: null,
          categorySource: null,
          priority: null,
          prioritySource: null,
          priorityRank: 1,
          aiConfidence: null,
          aiReasoning: null,
          createdAt: new Date("2026-10-24T10:00:00.000Z"),
          updatedAt: new Date("2026-10-24T10:00:00.000Z"),
          author: {
            id: "AUTH002",
            name: "Rahul Verma",
            email: "rahul@email.com",
          },
          book: null,
          assignee: null,
        },
      ],
      total: 1,
    });

    const res = await adminTicketService.listQueue(
      { status: "ALL", page: 1, pageSize: 20 },
      "ADM001",
    );

    expect(res.tickets[0].book).toBeNull();
    expect(res.tickets[0].assignee).toBeNull();
  });
});

describe("adminTicketService.getTicketDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns mapped detail, messages, notes, and other books", async () => {
    findByIdForAdmin.mockResolvedValueOnce({
      id: "TCK010",
      subject: "Royalty missing",
      description: "Detailed query",
      status: "OPEN",
      category: "ROYALTY_PAYMENTS",
      categorySource: "AI",
      priority: "HIGH",
      prioritySource: "AI",
      priorityRank: 1,
      aiConfidence: 0.9,
      aiReasoning: "Payment query",
      attachmentName: "receipt.pdf",
      createdAt: new Date("2026-10-24T08:00:00.000Z"),
      updatedAt: new Date("2026-10-24T09:00:00.000Z"),
      resolvedAt: null,
      authorId: "AUTH001",
      author: {
        id: "AUTH001",
        name: "Priya Sharma",
        email: "priya@email.com",
        phone: "+91 98765 43210",
        city: "Mumbai",
        joinedDate: new Date("2023-01-15T00:00:00.000Z"),
      },
      bookId: "BK001",
      book: {
        id: "BK001",
        title: "Whispers of the Ganges",
        isbn: "978-81-951234-0-1",
        genre: "Fiction",
        status: "Published",
        publicationDate: new Date("2023-05-10T00:00:00.000Z"),
        mrp: 399,
        royaltyPerCopy: 40,
        copiesSold: 120,
        royaltyEarned: 4800,
        royaltyPaid: 4000,
        royaltyPending: 800,
        lastPayoutDate: new Date("2023-08-15T00:00:00.000Z"),
        printPartner: "Repro India",
        availableOn: ["Amazon", "Flipkart"],
      },
      assignee: {
        id: "ADM001",
        name: "Support Lead",
        email: "admin@bookleaf.com",
      },
      messages: [
        {
          id: "MSG001",
          senderId: "ADM001",
          senderRole: "ADMIN",
          body: "Checking on this.",
          createdAt: new Date("2026-10-24T09:10:00.000Z"),
          usedAiDraft: false,
          sender: { id: "ADM001", name: "Support Lead", role: "ADMIN" },
        },
      ],
      notes: [
        {
          id: "NOTE001",
          adminId: "ADM001",
          body: "Spoke to finance.",
          createdAt: new Date("2026-10-24T09:05:00.000Z"),
          admin: { id: "ADM001", name: "Support Lead" },
        },
      ],
    });

    getAuthorOtherBooks.mockResolvedValueOnce([
      {
        id: "BK002",
        title: "The Saffron Diaries",
        status: "Published",
        copiesSold: 85,
        royaltyEarned: 3400,
      },
    ]);

    const res = await adminTicketService.getTicketDetail("TCK010");

    expect(findByIdForAdmin).toHaveBeenCalledWith("TCK010");
    expect(getAuthorOtherBooks).toHaveBeenCalledWith("AUTH001", "BK001");
    expect(res.ticket.id).toBe("TCK010");
    expect(res.ticket.author.name).toBe("Priya Sharma");
    expect(res.ticket.author.joinedDate).toBe("2023-01-15");
    expect(res.ticket.book?.title).toBe("Whispers of the Ganges");
    expect(res.ticket.authorOtherBooks).toHaveLength(1);
    expect(res.ticket.messages).toHaveLength(1);
    expect(res.ticket.messages[0].senderName).toBe("Support Lead");
    expect(res.ticket.notes).toHaveLength(1);
    expect(res.ticket.notes[0].adminName).toBe("Support Lead");
  });

  it("throws 404 NOT_FOUND when ticket does not exist", async () => {
    findByIdForAdmin.mockResolvedValueOnce(null);

    await expect(adminTicketService.getTicketDetail("NONEXISTENT")).rejects.toThrowError(AppError);
  });
});

describe("adminTicketService.updateTicket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates ticket and returns refreshed detail", async () => {
    findByIdForAdmin
      .mockResolvedValueOnce({
        id: "TCK020",
        authorId: "AUTH001",
        bookId: null,
      })
      .mockResolvedValueOnce({
        id: "TCK020",
        subject: "Updated",
        description: "Desc",
        status: "IN_PROGRESS",
        category: "ISBN_METADATA",
        categorySource: "MANUAL",
        priority: "CRITICAL",
        prioritySource: "MANUAL",
        priorityRank: 0,
        aiConfidence: null,
        aiReasoning: null,
        attachmentName: null,
        createdAt: new Date("2026-10-24T08:00:00.000Z"),
        updatedAt: new Date("2026-10-24T10:00:00.000Z"),
        resolvedAt: null,
        author: {
          id: "AUTH001",
          name: "Priya Sharma",
          email: "priya@email.com",
          phone: "123",
          city: "Mumbai",
          joinedDate: new Date("2023-01-01T00:00:00.000Z"),
        },
        book: null,
        assignee: null,
        messages: [],
        notes: [],
      });

    updateAdminTicket.mockResolvedValueOnce({});
    getAuthorOtherBooks.mockResolvedValueOnce([]);

    const res = await adminTicketService.updateTicket("TCK020", {
      status: "IN_PROGRESS",
      priority: "CRITICAL",
    });

    expect(updateAdminTicket).toHaveBeenCalledWith("TCK020", {
      status: "IN_PROGRESS",
      priority: "CRITICAL",
    });
    expect(res.ticket.status).toBe("IN_PROGRESS");
  });

  it("throws 404 when updating non-existent ticket", async () => {
    findByIdForAdmin.mockResolvedValueOnce(null);

    await expect(
      adminTicketService.updateTicket("NONEXISTENT", { status: "RESOLVED" }),
    ).rejects.toThrowError(AppError);
  });
});

describe("adminTicketService.replyToTicket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds admin reply and returns message DTO", async () => {
    findByIdForAdmin.mockResolvedValueOnce({
      id: "TCK030",
      status: "OPEN",
    });

    addAdminReply.mockResolvedValueOnce({
      id: "MSG020",
      ticketId: "TCK030",
      senderId: "ADM001",
      senderRole: "ADMIN",
      body: "Working on it.",
      createdAt: new Date("2026-10-24T10:30:00.000Z"),
      usedAiDraft: false,
      sender: { id: "ADM001", name: "Support Lead", role: "ADMIN" },
    });

    const res = await adminTicketService.replyToTicket("TCK030", "ADM001", {
      body: "Working on it.",
    });

    expect(addAdminReply).toHaveBeenCalledWith("TCK030", "ADM001", "Working on it.");
    expect(res.message.id).toBe("MSG020");
    expect(res.message.senderName).toBe("Support Lead");
  });

  it("throws 409 CONFLICT if replying to a CLOSED ticket", async () => {
    findByIdForAdmin.mockResolvedValueOnce({
      id: "TCK031",
      status: "CLOSED",
    });

    await expect(
      adminTicketService.replyToTicket("TCK031", "ADM001", { body: "Reply" }),
    ).rejects.toThrowError(AppError);

    expect(addAdminReply).not.toHaveBeenCalled();
  });
});

describe("adminTicketService.addNote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds internal note and returns note DTO", async () => {
    findByIdForAdmin.mockResolvedValueOnce({
      id: "TCK040",
    });

    addInternalNote.mockResolvedValueOnce({
      id: "NOTE010",
      ticketId: "TCK040",
      adminId: "ADM001",
      body: "Private internal detail",
      createdAt: new Date("2026-10-24T10:45:00.000Z"),
      admin: { id: "ADM001", name: "Support Lead" },
    });

    const res = await adminTicketService.addNote("TCK040", "ADM001", {
      body: "Private internal detail",
    });

    expect(addInternalNote).toHaveBeenCalledWith("TCK040", "ADM001", "Private internal detail");
    expect(res.note.id).toBe("NOTE010");
    expect(res.note.adminName).toBe("Support Lead");
    expect(res.note.body).toBe("Private internal detail");
  });

  it("throws 404 when adding note to non-existent ticket", async () => {
    findByIdForAdmin.mockResolvedValueOnce(null);

    await expect(
      adminTicketService.addNote("NONEXISTENT", "ADM001", { body: "Private note" }),
    ).rejects.toThrowError(AppError);

    expect(addInternalNote).not.toHaveBeenCalled();
  });
});
