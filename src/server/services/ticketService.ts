import "server-only";
import type { TicketStatus } from "@/generated/prisma/enums";
import { AppError } from "@/server/http/AppError";
import { bookRepo } from "@/server/repositories/bookRepo";
import { ticketRepo } from "@/server/repositories/ticketRepo";
import type { TicketSummaryDto } from "@/shared/dto";
import type { CreateTicketInput } from "@/shared/schemas/ticket";

export type TicketWithBook = {
  id: string;
  subject: string;
  status: TicketStatus;
  createdAt: Date;
  updatedAt: Date;
  book: { id: string; title: string } | null;
};

export function toTicketSummaryDto(ticket: TicketWithBook): TicketSummaryDto {
  return {
    id: ticket.id,
    subject: ticket.subject,
    status: ticket.status,
    book: ticket.book ? { id: ticket.book.id, title: ticket.book.title } : null,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}

export const ticketService = {
  async create(authorId: string, input: CreateTicketInput): Promise<TicketSummaryDto> {
    if (input.bookId) {
      const book = await bookRepo.findOwned(authorId, input.bookId);
      if (!book) {
        throw AppError.notFound("Book");
      }
    }

    const created = await ticketRepo.create({
      authorId,
      bookId: input.bookId,
      subject: input.subject,
      description: input.description,
      attachmentName: input.attachmentName,
    });

    return toTicketSummaryDto(created);
  },
};
