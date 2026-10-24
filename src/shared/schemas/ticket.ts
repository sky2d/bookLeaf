import { z } from "zod";

export function sanitizeAttachmentName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const basename = trimmed.split(/[\\/]/).pop()?.trim() ?? "";
  if (!basename) return null;
  return basename.slice(0, 255);
}

export const createTicketSchema = z.object({
  subject: z
    .string({ error: "Subject is required." })
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .min(5, "Subject must be at least 5 characters.")
        .max(150, "Subject cannot exceed 150 characters."),
    ),
  description: z
    .string({ error: "Description is required." })
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .min(20, "Description must be at least 20 characters.")
        .max(5000, "Description cannot exceed 5,000 characters."),
    ),
  bookId: z
    .preprocess((val) => {
      if (typeof val === "string") {
        const trimmed = val.trim();
        return trimmed === "" ? null : trimmed;
      }
      return val ?? null;
    }, z.string().min(1, "Invalid book ID.").nullable().optional())
    .default(null),
  attachmentName: z
    .preprocess((val) => sanitizeAttachmentName(val), z.string().max(255).nullable().optional())
    .default(null),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const createMessageSchema = z.object({
  body: z
    .string({ error: "Message is required." })
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .min(1, "Message cannot be empty.")
        .max(5000, "Message cannot exceed 5,000 characters."),
    ),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;
