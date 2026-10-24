import { describe, expect, it } from "vitest";
import {
  createAdminMessageSchema,
  createInternalNoteSchema,
  updateTicketSchema,
} from "./adminTicket";

describe("updateTicketSchema", () => {
  it("accepts a valid status update", () => {
    const parsed = updateTicketSchema.parse({ status: "IN_PROGRESS" });
    expect(parsed.status).toBe("IN_PROGRESS");
  });

  it("accepts a valid category update", () => {
    const parsed = updateTicketSchema.parse({ category: "ROYALTY_PAYMENTS" });
    expect(parsed.category).toBe("ROYALTY_PAYMENTS");
  });

  it("accepts a valid priority update", () => {
    const parsed = updateTicketSchema.parse({ priority: "CRITICAL" });
    expect(parsed.priority).toBe("CRITICAL");
  });

  it("accepts setting assigneeId to a user ID or null", () => {
    const withId = updateTicketSchema.parse({ assigneeId: "usr_adm_1" });
    expect(withId.assigneeId).toBe("usr_adm_1");

    const withNull = updateTicketSchema.parse({ assigneeId: null });
    expect(withNull.assigneeId).toBeNull();

    const withEmpty = updateTicketSchema.parse({ assigneeId: "  " });
    expect(withEmpty.assigneeId).toBeNull();
  });

  it("rejects an empty update with no fields", () => {
    expect(() => updateTicketSchema.parse({})).toThrow(
      "At least one field (status, category, priority, or assigneeId) must be provided.",
    );
  });

  it("rejects invalid status or category values", () => {
    expect(() => updateTicketSchema.parse({ status: "UNKNOWN" })).toThrow();
    expect(() => updateTicketSchema.parse({ category: "INVALID_CAT" })).toThrow();
    expect(() => updateTicketSchema.parse({ priority: "SUPER_URGENT" })).toThrow();
  });
});

describe("createAdminMessageSchema", () => {
  it("accepts a valid message and trims whitespace", () => {
    const parsed = createAdminMessageSchema.parse({ body: "  We are looking into this.  " });
    expect(parsed.body).toBe("We are looking into this.");
  });

  it("rejects empty or whitespace-only messages", () => {
    expect(() => createAdminMessageSchema.parse({ body: "" })).toThrow();
    expect(() => createAdminMessageSchema.parse({ body: "   " })).toThrow();
  });

  it("rejects messages longer than 5000 characters", () => {
    expect(() => createAdminMessageSchema.parse({ body: "a".repeat(5001) })).toThrow();
  });
});

describe("createInternalNoteSchema", () => {
  it("accepts a valid internal note and trims whitespace", () => {
    const parsed = createInternalNoteSchema.parse({ body: "  Spoke to author over phone.  " });
    expect(parsed.body).toBe("Spoke to author over phone.");
  });

  it("rejects empty or whitespace-only notes", () => {
    expect(() => createInternalNoteSchema.parse({ body: "" })).toThrow();
    expect(() => createInternalNoteSchema.parse({ body: "   " })).toThrow();
  });

  it("rejects notes longer than 5000 characters", () => {
    expect(() => createInternalNoteSchema.parse({ body: "a".repeat(5001) })).toThrow();
  });
});
