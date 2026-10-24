import { beforeEach, describe, expect, it, vi } from "vitest";

const findQueue = vi.fn();
const buildWhereClause = vi.fn();

vi.mock("@/server/repositories/ticketRepo", () => ({
  ticketRepo: {
    findQueue: (opts: unknown) => findQueue(opts),
    buildWhereClause: (q: unknown, uId?: string) => buildWhereClause(q, uId),
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
    expect(res.tickets[0]).toEqual({
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
      createdAt: "2026-10-24T08:00:00.000Z",
      updatedAt: "2026-10-24T09:00:00.000Z",
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
    });
    expect(res.pagination).toEqual({
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
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
    expect(res.tickets[0].category).toBeNull();
    expect(res.tickets[0].priority).toBeNull();
  });

  it("computes skip, take, and totalPages accurately for pagination", async () => {
    buildWhereClause.mockReturnValueOnce({});
    findQueue.mockResolvedValueOnce({
      tickets: [],
      total: 45,
    });

    const res = await adminTicketService.listQueue(
      { status: "UNRESOLVED", page: 3, pageSize: 15 },
      "ADM001",
    );

    expect(findQueue).toHaveBeenCalledWith({
      where: {},
      skip: 30,
      take: 15,
    });
    expect(res.pagination).toEqual({
      page: 3,
      pageSize: 15,
      total: 45,
      totalPages: 3,
    });
  });

  it("returns totalPages = 1 when total is 0", async () => {
    buildWhereClause.mockReturnValueOnce({});
    findQueue.mockResolvedValueOnce({
      tickets: [],
      total: 0,
    });

    const res = await adminTicketService.listQueue(
      { status: "UNRESOLVED", page: 1, pageSize: 20 },
      "ADM001",
    );

    expect(res.pagination.totalPages).toBe(1);
    expect(res.pagination.total).toBe(0);
  });
});
