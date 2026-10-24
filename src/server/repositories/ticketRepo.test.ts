import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db", () => ({
  db: {
    ticket: {},
    $transaction: vi.fn(),
  },
}));

import { db } from "@/server/db";
import { ticketRepo } from "./ticketRepo";

describe("ticketRepo.findByIdForAuthor", () => {
  it("scopes the lookup to the author, so one author can never load another's ticket", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    Object.assign(db.ticket, { findFirst });

    await ticketRepo.findByIdForAuthor("tkt_1", "AUTH007");

    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "tkt_1", authorId: "AUTH007" } }));
  });
});

describe("ticketRepo.addMessageAndReopen", () => {
  it("reopens without touching priorityRank, so the ticket keeps sorting by its real priority", async () => {
    const update = vi.fn();
    const tx = { ticketMessage: { create: vi.fn().mockResolvedValue({ id: "msg_1" }) }, ticket: { update } };
    vi.mocked(db.$transaction).mockImplementationOnce(((fn: (t: unknown) => unknown) => fn(tx)) as never);

    await ticketRepo.addMessageAndReopen("tkt_1", "usr_1", "AUTHOR", "Still broken.");

    const { data } = update.mock.calls[0][0];
    expect(data).toMatchObject({ status: "OPEN", resolvedAt: null });
    expect(data).not.toHaveProperty("priorityRank");
  });
});

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
