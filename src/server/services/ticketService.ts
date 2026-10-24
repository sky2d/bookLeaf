import "server-only";
import type { Role, TicketStatus } from "@/generated/prisma/enums";
import { AppError } from "@/server/http/AppError";
import { bookRepo } from "@/server/repositories/bookRepo";
import { ticketRepo } from "@/server/repositories/ticketRepo";
import type { AuthorTicketDto, TicketMessageDto, TicketSummaryDto } from "@/shared/dto";
import type { CreateMessageInput, CreateTicketInput } from "@/shared/schemas/ticket";

export type TicketWithBook = {
  id: string;
  subject: string;
  status: TicketStatus;
  createdAt: Date;
  updatedAt: Date;
  book: { id: string; title: string } | null;
};

export type TicketMessageWithSender = {
  id: string;
  body: string;
  senderRole: Role;
  createdAt: Date;
  sender: { id: string; name: string; role: Role };
};

export type TicketDetailForAuthor = {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  attachmentName: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  book: { id: string; title: string } | null;
  messages: TicketMessageWithSender[];
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

export function toTicketMessageDto(msg: TicketMessageWithSender): TicketMessageDto {
  return {
    id: msg.id,
    body: msg.body,
    senderRole: msg.senderRole,
    senderName: msg.senderRole === "ADMIN" ? "Team BookLeaf" : msg.sender.name,
    createdAt: msg.createdAt.toISOString(),
  };
}

export function toAuthorTicketDto(ticket: TicketDetailForAuthor): AuthorTicketDto {
  return {
    id: ticket.id,
    subject: ticket.subject,
    description: ticket.description,
    status: ticket.status,
    attachmentName: ticket.attachmentName,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    resolvedAt: ticket.resolvedAt ? ticket.resolvedAt.toISOString() : null,
    book: ticket.book ? { id: ticket.book.id, title: ticket.book.title } : null,
    messages: ticket.messages.map(toTicketMessageDto),
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

  async getForAuthor(ticketId: string, authorId: string): Promise<AuthorTicketDto> {
    const ticket = await ticketRepo.findByIdForAuthor(ticketId, authorId);
    if (!ticket) {
      throw AppError.notFound("Ticket");
    }
    return toAuthorTicketDto(ticket);
  },

  async addAuthorMessage(
    ticketId: string,
    authorId: string,
    userId: string,
    input: CreateMessageInput,
  ): Promise<TicketMessageDto> {
    const ticket = await ticketRepo.findByIdForAuthor(ticketId, authorId);
    if (!ticket) {
      throw AppError.notFound("Ticket");
    }

    if (ticket.status === "CLOSED") {
      throw AppError.conflict(
        "This ticket is closed and cannot receive new messages. Please raise a new query if you need further help.",
      );
    }

    const created =
      ticket.status === "RESOLVED"
        ? await ticketRepo.addMessageAndReopen(ticketId, userId, "AUTHOR", input.body)
        : await ticketRepo.addMessage(ticketId, userId, "AUTHOR", input.body);

    return toTicketMessageDto(created);
  },
};
