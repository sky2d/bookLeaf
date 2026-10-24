import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db", () => ({
  db: {
    ticket: {},
    $transaction: vi.fn(),
  },
}));

import { ticketRepo } from "./ticketRepo";

describe("ticketRepo.buildWhereClause", () => {
  it("builds unresolved status filter by default", () => {
    const where = ticketRepo.buildWhereClause({
      status: "UNRESOLVED",
      page: 1,
      pageSize: 20,
    });

    expect(where.status).toEqual({ in: ["OPEN", "IN_PROGRESS"] });
  });

  it("omits status filter when status is ALL", () => {
    const where = ticketRepo.buildWhereClause({
      status: "ALL",
      page: 1,
      pageSize: 20,
    });

    expect(where.status).toBeUndefined();
  });

  it("filters by specific status", () => {
    const where = ticketRepo.buildWhereClause({
      status: "RESOLVED",
      page: 1,
      pageSize: 20,
    });

    expect(where.status).toBe("RESOLVED");
  });

  it("handles assignee 'me' by binding to current user ID", () => {
    const where = ticketRepo.buildWhereClause(
      {
        status: "UNRESOLVED",
        assignee: "me",
        page: 1,
        pageSize: 20,
      },
      "user_admin_123",
    );

    expect(where.assigneeId).toBe("user_admin_123");
  });

  it("handles assignee 'unassigned' by filtering for null", () => {
    const where = ticketRepo.buildWhereClause({
      status: "UNRESOLVED",
      assignee: "unassigned",
      page: 1,
      pageSize: 20,
    });

    expect(where.assigneeId).toBeNull();
  });

  it("handles explicit assignee ID", () => {
    const where = ticketRepo.buildWhereClause({
      status: "UNRESOLVED",
      assignee: "user_agent_456",
      page: 1,
      pageSize: 20,
    });

    expect(where.assigneeId).toBe("user_agent_456");
  });

  it("builds calendar date range boundaries", () => {
    const where = ticketRepo.buildWhereClause({
      status: "UNRESOLVED",
      from: "2026-10-01",
      to: "2026-10-24",
      page: 1,
      pageSize: 20,
    });

    expect(where.createdAt).toEqual({
      gte: new Date("2026-10-01T00:00:00.000Z"),
      lte: new Date("2026-10-24T23:59:59.999Z"),
    });
  });

  it("builds multi-field case-insensitive search OR clause", () => {
    const where = ticketRepo.buildWhereClause({
      status: "UNRESOLVED",
      q: "Royalty issue",
      page: 1,
      pageSize: 20,
    });

    expect(where.OR).toEqual([
      { subject: { contains: "Royalty issue", mode: "insensitive" } },
      { description: { contains: "Royalty issue", mode: "insensitive" } },
      { author: { is: { name: { contains: "Royalty issue", mode: "insensitive" } } } },
      { author: { is: { email: { contains: "Royalty issue", mode: "insensitive" } } } },
      { book: { is: { title: { contains: "Royalty issue", mode: "insensitive" } } } },
    ]);
  });
});
