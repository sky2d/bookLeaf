import "server-only";
import { AppError } from "@/server/http/AppError";
import { ticketRepo } from "@/server/repositories/ticketRepo";
import { userRepo } from "@/server/repositories/userRepo";
import type {
  AdminTicketDetailResponse,
  AdminTicketDto,
  AdminTicketQueueResponse,
  CreateInternalNoteResponse,
  CreateMessageResponse,
} from "@/shared/dto";
import type {
  CreateAdminMessageInput,
  CreateInternalNoteInput,
  UpdateTicketInput,
} from "@/shared/schemas/adminTicket";
import type { TicketQueryInput } from "@/shared/schemas/ticketQuery";
import { notifyAdminOnly, notifyTicketUpdated } from "@/server/realtime/broadcast";

export const adminTicketService = {
  async listQueue(query: TicketQueryInput, currentUserId: string): Promise<AdminTicketQueueResponse> {
    const page = query.page;
    const pageSize = query.pageSize;
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const where = ticketRepo.buildWhereClause(query, currentUserId);
    const { tickets, total } = await ticketRepo.findQueue({ where, skip, take });

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const mappedTickets: AdminTicketDto[] = tickets.map((t) => ({
      id: t.id,
      subject: t.subject,
      status: t.status,
      category: t.category,
      categorySource: t.categorySource,
      priority: t.priority,
      prioritySource: t.prioritySource,
      priorityRank: t.priorityRank,
      aiConfidence: t.aiConfidence,
      aiReasoning: t.aiReasoning,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      author: {
        id: t.author.id,
        name: t.author.name,
        email: t.author.email,
      },
      book: t.book ? { id: t.book.id, title: t.book.title } : null,
      assignee: t.assignee ? { id: t.assignee.id, name: t.assignee.name } : null,
    }));

    return {
      tickets: mappedTickets,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    };
  },

  async getTicketDetail(id: string): Promise<AdminTicketDetailResponse> {
    const ticket = await ticketRepo.findByIdForAdmin(id);
    if (!ticket) {
      throw new AppError(404, "NOT_FOUND", "Ticket not found.");
    }

    const otherBooks = await ticketRepo.getAuthorOtherBooks(ticket.authorId, ticket.bookId);

    return {
      ticket: {
        id: ticket.id,
        subject: ticket.subject,
        description: ticket.description,
        status: ticket.status,
        category: ticket.category,
        categorySource: ticket.categorySource,
        priority: ticket.priority,
        prioritySource: ticket.prioritySource,
        priorityRank: ticket.priorityRank,
        aiConfidence: ticket.aiConfidence,
        aiReasoning: ticket.aiReasoning,
        attachmentName: ticket.attachmentName,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
        resolvedAt: ticket.resolvedAt ? ticket.resolvedAt.toISOString() : null,
        author: {
          id: ticket.author.id,
          name: ticket.author.name,
          email: ticket.author.email,
          phone: ticket.author.phone,
          city: ticket.author.city,
          joinedDate: ticket.author.joinedDate.toISOString().slice(0, 10),
        },
        book: ticket.book
          ? {
              id: ticket.book.id,
              title: ticket.book.title,
              isbn: ticket.book.isbn,
              genre: ticket.book.genre,
              status: ticket.book.status,
              publicationDate: ticket.book.publicationDate
                ? ticket.book.publicationDate.toISOString().slice(0, 10)
                : null,
              mrp: ticket.book.mrp,
              royaltyPerCopy: ticket.book.royaltyPerCopy,
              copiesSold: ticket.book.copiesSold,
              royaltyEarned: ticket.book.royaltyEarned,
              royaltyPaid: ticket.book.royaltyPaid,
              royaltyPending: ticket.book.royaltyPending,
              lastPayoutDate: ticket.book.lastPayoutDate
                ? ticket.book.lastPayoutDate.toISOString().slice(0, 10)
                : null,
              printPartner: ticket.book.printPartner,
              availableOn: ticket.book.availableOn,
            }
          : null,
        authorOtherBooks: otherBooks,
        assignee: ticket.assignee
          ? {
              id: ticket.assignee.id,
              name: ticket.assignee.name,
              email: ticket.assignee.email,
            }
          : null,
        messages: ticket.messages.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          senderRole: m.senderRole,
          senderName: m.senderRole === "ADMIN" ? m.sender.name : ticket.author.name,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
          usedAiDraft: m.usedAiDraft,
        })),
        notes: ticket.notes.map((n) => ({
          id: n.id,
          adminId: n.adminId,
          adminName: n.admin.name,
          body: n.body,
          createdAt: n.createdAt.toISOString(),
        })),
      },
    };
  },

  async updateTicket(id: string, input: UpdateTicketInput): Promise<AdminTicketDetailResponse> {
    const existing = await ticketRepo.findByIdForAdmin(id);
    if (!existing) {
      throw new AppError(404, "NOT_FOUND", "Ticket not found.");
    }

    if (input.assigneeId && !(await userRepo.findAdmin(input.assigneeId))) {
      throw AppError.badRequest("Tickets can only be assigned to a BookLeaf admin.");
    }

    await ticketRepo.updateAdminTicket(id, input);
    await notifyTicketUpdated(id, existing.authorId, "ticket.updated");

    return this.getTicketDetail(id);
  },

  async replyToTicket(
    ticketId: string,
    adminId: string,
    input: CreateAdminMessageInput,
  ): Promise<CreateMessageResponse> {
    const ticket = await ticketRepo.findByIdForAdmin(ticketId);
    if (!ticket) {
      throw new AppError(404, "NOT_FOUND", "Ticket not found.");
    }

    if (ticket.status === "CLOSED") {
      throw new AppError(409, "CONFLICT", "This ticket is closed and cannot receive replies.");
    }

    const message = await ticketRepo.addAdminReply(
      ticketId,
      adminId,
      input.body,
      input.usedAiDraft ?? false,
    );
    await notifyTicketUpdated(ticketId, ticket.authorId, "ticket.reply");

    return {
      message: {
        id: message.id,
        senderRole: "ADMIN",
        senderName: message.sender.name,
        body: message.body,
        createdAt: message.createdAt.toISOString(),
      },
    };
  },

  async addNote(
    ticketId: string,
    adminId: string,
    input: CreateInternalNoteInput,
  ): Promise<CreateInternalNoteResponse> {
    const ticket = await ticketRepo.findByIdForAdmin(ticketId);
    if (!ticket) {
      throw new AppError(404, "NOT_FOUND", "Ticket not found.");
    }

    const note = await ticketRepo.addInternalNote(ticketId, adminId, input.body);
    await notifyAdminOnly(ticketId, "ticket.note");

    return {
      note: {
        id: note.id,
        adminId: note.adminId,
        adminName: note.admin.name,
        body: note.body,
        createdAt: note.createdAt.toISOString(),
      },
    };
  },
};
