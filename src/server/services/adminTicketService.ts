import "server-only";
import { ticketRepo } from "@/server/repositories/ticketRepo";
import type { AdminTicketDto, AdminTicketQueueResponse } from "@/shared/dto";
import type { TicketQueryInput } from "@/shared/schemas/ticketQuery";

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
};
