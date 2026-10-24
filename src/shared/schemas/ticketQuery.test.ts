import { describe, expect, it } from "vitest";
import { ticketQuerySchema } from "./ticketQuery";

describe("ticketQuerySchema", () => {
  it("defaults status to UNRESOLVED, page to 1, and pageSize to 20 when given empty input", () => {
    const parsed = ticketQuerySchema.parse({});
    expect(parsed).toEqual({
      status: "UNRESOLVED",
      page: 1,
      pageSize: 20,
    });
  });

  it("handles string coercion for page and pageSize from query string params", () => {
    const parsed = ticketQuerySchema.parse({
      page: "3",
      pageSize: "50",
    });
    expect(parsed.page).toBe(3);
    expect(parsed.pageSize).toBe(50);
  });

  it("cleans empty strings to undefined and falls back to defaults", () => {
    const parsed = ticketQuerySchema.parse({
      status: "",
      category: "",
      priority: "",
      assignee: "   ",
      from: "",
      to: "",
      q: "  ",
      page: "",
      pageSize: "",
    });
    expect(parsed).toEqual({
      status: "UNRESOLVED",
      page: 1,
      pageSize: 20,
    });
  });

  it("accepts valid status and category values", () => {
    const parsed = ticketQuerySchema.parse({
      status: "OPEN",
      category: "ROYALTY_PAYMENTS",
      priority: "CRITICAL",
    });
    expect(parsed.status).toBe("OPEN");
    expect(parsed.category).toBe("ROYALTY_PAYMENTS");
    expect(parsed.priority).toBe("CRITICAL");
  });

  it("accepts special status ALL", () => {
    const parsed = ticketQuerySchema.parse({ status: "ALL" });
    expect(parsed.status).toBe("ALL");
  });

  it("accepts valid date range and trimmed search query", () => {
    const parsed = ticketQuerySchema.parse({
      from: "2026-10-01",
      to: "2026-10-24",
      q: "Royalty issue",
      assignee: "me",
    });
    expect(parsed.from).toBe("2026-10-01");
    expect(parsed.to).toBe("2026-10-24");
    expect(parsed.q).toBe("Royalty issue");
    expect(parsed.assignee).toBe("me");
  });

  it("rejects invalid status", () => {
    expect(() => ticketQuerySchema.parse({ status: "INVALID_STATUS" })).toThrow();
  });

  it("rejects invalid date formats", () => {
    expect(() => ticketQuerySchema.parse({ from: "24-10-2026" })).toThrow();
    expect(() => ticketQuerySchema.parse({ to: "not-a-date" })).toThrow();
  });

  it("rejects invalid page and pageSize numbers", () => {
    expect(() => ticketQuerySchema.parse({ page: "0" })).toThrow();
    expect(() => ticketQuerySchema.parse({ page: "-1" })).toThrow();
    expect(() => ticketQuerySchema.parse({ pageSize: "101" })).toThrow();
  });
});
