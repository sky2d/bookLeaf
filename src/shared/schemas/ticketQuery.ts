import { z } from "zod";
import { TicketCategory, TicketPriority, TicketStatus } from "@/generated/prisma/enums";

export const TicketQueueStatus = {
  ...TicketStatus,
  UNRESOLVED: "UNRESOLVED",
  ALL: "ALL",
} as const;

export type TicketQueueStatus = (typeof TicketQueueStatus)[keyof typeof TicketQueueStatus];

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

function emptyToUndefined(val: unknown) {
  if (typeof val === "string") {
    const trimmed = val.trim();
    return trimmed === "" ? undefined : trimmed;
  }
  return val === null ? undefined : val;
}

export const ticketQuerySchema = z.object({
  status: z
    .preprocess(emptyToUndefined, z.nativeEnum(TicketQueueStatus).optional())
    .default(TicketQueueStatus.UNRESOLVED),
  category: z.preprocess(emptyToUndefined, z.nativeEnum(TicketCategory).optional()),
  priority: z.preprocess(emptyToUndefined, z.nativeEnum(TicketPriority).optional()),
  assignee: z.preprocess(emptyToUndefined, z.string().max(100).optional()),
  from: z.preprocess(
    emptyToUndefined,
    z.string().regex(dateRegex, "From date must be in YYYY-MM-DD format.").optional(),
  ),
  to: z.preprocess(
    emptyToUndefined,
    z.string().regex(dateRegex, "To date must be in YYYY-MM-DD format.").optional(),
  ),
  q: z.preprocess(emptyToUndefined, z.string().max(150).optional()),
  page: z
    .preprocess(emptyToUndefined, z.coerce.number().int().min(1, "Page must be >= 1").optional())
    .default(1),
  pageSize: z
    .preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(1).max(100, "Page size must be <= 100").optional(),
    )
    .default(20),
});

export type TicketQueryInput = z.infer<typeof ticketQuerySchema>;
