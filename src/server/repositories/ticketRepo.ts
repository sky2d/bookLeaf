import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/enums";
import { db } from "@/server/db";
import type { TicketQueryInput } from "@/shared/schemas/ticketQuery";

export type CreateTicketData = {
  authorId: string;
  bookId: string | null;
  subject: string;
  description: string;
  attachmentName?: string | null;
};

export const ticketRepo = {
  create(data: CreateTicketData) {
    return db.ticket.create({
      data: {
        authorId: data.authorId,
        bookId: data.bookId,
        subject: data.subject,
        description: data.description,
        attachmentName: data.attachmentName ?? null,
        status: "OPEN",
        priorityRank: 1,
      },
      include: {
        book: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  },

  listByAuthor(authorId: string) {
    return db.ticket.findMany({
      where: { authorId },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      include: {
        book: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  },

  findByIdForAuthor(id: string, authorId: string) {
    return db.ticket.findFirst({
      where: { id, authorId },
      include: {
        book: {
          select: {
            id: true,
            title: true,
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
      },
    });
  },

  async addMessage(ticketId: string, senderId: string, senderRole: Role, body: string) {
    return db.$transaction(async (tx) => {
      const message = await tx.ticketMessage.create({
        data: {
          ticketId,
          senderId,
          senderRole,
          body,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      });

      await tx.ticket.update({
        where: { id: ticketId },
        data: { updatedAt: new Date() },
      });

      return message;
    });
  },

  async addMessageAndReopen(ticketId: string, senderId: string, senderRole: Role, body: string) {
    return db.$transaction(async (tx) => {
      const message = await tx.ticketMessage.create({
        data: {
          ticketId,
          senderId,
          senderRole,
          body,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      });

      await tx.ticket.update({
        where: { id: ticketId },
        data: {
          status: "OPEN",
          resolvedAt: null,
          priorityRank: 1,
          updatedAt: new Date(),
        },
      });

      return message;
    });
  },

  buildWhereClause(query: TicketQueryInput, currentUserId?: string): Prisma.TicketWhereInput {
    const where: Prisma.TicketWhereInput = {};

    if (query.status === "UNRESOLVED") {
      where.status = { in: ["OPEN", "IN_PROGRESS"] };
    } else if (query.status && query.status !== "ALL") {
      where.status = query.status;
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.assignee === "me") {
      if (currentUserId) {
        where.assigneeId = currentUserId;
      }
    } else if (query.assignee === "unassigned") {
      where.assigneeId = null;
    } else if (query.assignee) {
      where.assigneeId = query.assignee;
    }

    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) {
        where.createdAt.gte = new Date(`${query.from}T00:00:00.000Z`);
      }
      if (query.to) {
        where.createdAt.lte = new Date(`${query.to}T23:59:59.999Z`);
      }
    }

    if (query.q && query.q.trim()) {
      const term = query.q.trim();
      where.OR = [
        { subject: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        { author: { is: { name: { contains: term, mode: "insensitive" } } } },
        { author: { is: { email: { contains: term, mode: "insensitive" } } } },
        { book: { is: { title: { contains: term, mode: "insensitive" } } } },
      ];
    }

    return where;
  },

  async findQueue(options: { where?: Prisma.TicketWhereInput; skip?: number; take?: number } = {}) {
    const { where, skip = 0, take = 20 } = options;
    const [tickets, total] = await db.$transaction([
      db.ticket.findMany({
        where,
        skip,
        take,
        orderBy: [{ priorityRank: "asc" }, { createdAt: "asc" }],
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          book: {
            select: {
              id: true,
              title: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      db.ticket.count({ where }),
    ]);

    return { tickets, total };
  },
};
