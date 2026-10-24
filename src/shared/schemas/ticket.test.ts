import { describe, expect, it } from "vitest";
import { createMessageSchema, createTicketSchema, sanitizeAttachmentName } from "./ticket";

describe("sanitizeAttachmentName", () => {
  it("extracts basename from Windows fakepath", () => {
    expect(sanitizeAttachmentName("C:\\fakepath\\statement.pdf")).toBe("statement.pdf");
  });

  it("extracts basename from Unix path", () => {
    expect(sanitizeAttachmentName("/home/user/docs/report.xlsx")).toBe("report.xlsx");
  });

  it("returns null for empty or non-string input", () => {
    expect(sanitizeAttachmentName("")).toBeNull();
    expect(sanitizeAttachmentName("   ")).toBeNull();
    expect(sanitizeAttachmentName(null)).toBeNull();
    expect(sanitizeAttachmentName(undefined)).toBeNull();
  });

  it("caps attachment name at 255 chars", () => {
    const longName = "a".repeat(300) + ".pdf";
    const sanitized = sanitizeAttachmentName(longName);
    expect(sanitized?.length).toBe(255);
  });
});

describe("createTicketSchema", () => {
  const validBase = {
    subject: "Valid Subject Line",
    description: "This is a detailed description of the issue that exceeds twenty characters.",
  };

  it("accepts valid input with minimal fields", () => {
    const result = createTicketSchema.safeParse(validBase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subject).toBe("Valid Subject Line");
      expect(result.data.bookId).toBeNull();
      expect(result.data.attachmentName).toBeNull();
    }
  });

  it("accepts valid bookId and strips empty string to null", () => {
    const withBook = createTicketSchema.parse({ ...validBase, bookId: "BK001" });
    expect(withBook.bookId).toBe("BK001");

    const withEmptyBook = createTicketSchema.parse({ ...validBase, bookId: "" });
    expect(withEmptyBook.bookId).toBeNull();

    const withWhitespaceBook = createTicketSchema.parse({ ...validBase, bookId: "   " });
    expect(withWhitespaceBook.bookId).toBeNull();
  });

  it("sanitizes attachmentName", () => {
    const res = createTicketSchema.parse({
      ...validBase,
      attachmentName: "C:\\fakepath\\invoice.pdf",
    });
    expect(res.attachmentName).toBe("invoice.pdf");
  });

  it("enforces subject boundaries (5 to 150)", () => {
    // 4 chars
    expect(createTicketSchema.safeParse({ ...validBase, subject: "1234" }).success).toBe(false);
    // 5 chars
    expect(createTicketSchema.safeParse({ ...validBase, subject: "12345" }).success).toBe(true);
    // 150 chars
    expect(createTicketSchema.safeParse({ ...validBase, subject: "a".repeat(150) }).success).toBe(true);
    // 151 chars
    expect(createTicketSchema.safeParse({ ...validBase, subject: "a".repeat(151) }).success).toBe(false);
    // whitespace only
    expect(createTicketSchema.safeParse({ ...validBase, subject: "      " }).success).toBe(false);
  });

  it("enforces description boundaries (20 to 5000)", () => {
    // 19 chars
    expect(createTicketSchema.safeParse({ ...validBase, description: "1234567890123456789" }).success).toBe(false);
    // 20 chars
    expect(createTicketSchema.safeParse({ ...validBase, description: "12345678901234567890" }).success).toBe(true);
    // 5000 chars
    expect(createTicketSchema.safeParse({ ...validBase, description: "a".repeat(5000) }).success).toBe(true);
    // 5001 chars
    expect(createTicketSchema.safeParse({ ...validBase, description: "a".repeat(5001) }).success).toBe(false);
    // whitespace only
    expect(createTicketSchema.safeParse({ ...validBase, description: " ".repeat(30) }).success).toBe(false);
  });
});

describe("createMessageSchema", () => {
  it("accepts valid message body", () => {
    const res = createMessageSchema.safeParse({ body: "Please check this update." });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.body).toBe("Please check this update.");
    }
  });

  it("trims message body", () => {
    const res = createMessageSchema.parse({ body: "   Hello   " });
    expect(res.body).toBe("Hello");
  });

  it("rejects empty or whitespace-only message", () => {
    expect(createMessageSchema.safeParse({ body: "" }).success).toBe(false);
    expect(createMessageSchema.safeParse({ body: "     " }).success).toBe(false);
  });

  it("enforces max length 5000", () => {
    expect(createMessageSchema.safeParse({ body: "a".repeat(5000) }).success).toBe(true);
    expect(createMessageSchema.safeParse({ body: "a".repeat(5001) }).success).toBe(false);
  });
});
