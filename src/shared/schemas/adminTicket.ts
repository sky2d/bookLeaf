import { z } from "zod";
import { TicketCategory, TicketPriority, TicketStatus } from "@/generated/prisma/enums";

export const updateTicketSchema = z
  .object({
    status: z.nativeEnum(TicketStatus).optional(),
    category: z.nativeEnum(TicketCategory).optional(),
    priority: z.nativeEnum(TicketPriority).optional(),
    assigneeId: z
      .preprocess((val) => {
        if (typeof val === "string") {
          const trimmed = val.trim();
          return trimmed === "" ? null : trimmed;
        }
        return val ?? null;
      }, z.string().min(1).nullable().optional()),
  })
  .refine(
    (data) =>
      data.status !== undefined ||
      data.category !== undefined ||
      data.priority !== undefined ||
      data.assigneeId !== undefined,
    {
      message: "At least one field (status, category, priority, or assigneeId) must be provided.",
    },
  );

export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;

export const createAdminMessageSchema = z.object({
  body: z
    .string({ error: "Message is required." })
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .min(1, "Message cannot be empty.")
        .max(5000, "Message cannot exceed 5,000 characters."),
    ),
  usedAiDraft: z.boolean().optional(),
});

export type CreateAdminMessageInput = z.infer<typeof createAdminMessageSchema>;

export const createInternalNoteSchema = z.object({
  body: z
    .string({ error: "Note cannot be empty." })
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .min(1, "Note cannot be empty.")
        .max(5000, "Note cannot exceed 5,000 characters."),
    ),
});

export type CreateInternalNoteInput = z.infer<typeof createInternalNoteSchema>;
