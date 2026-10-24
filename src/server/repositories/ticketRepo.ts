import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { Role, TicketCategory, TicketPriority, TicketStatus } from "@/generated/prisma/enums";
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

  findByIdForAdmin(id: string) {
    return db.ticket.findUnique({
      where: { id },
      include: {
        author: true,
        book: true,
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
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
        notes: {
          orderBy: { createdAt: "asc" },
          include: {
            admin: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  },

  getAuthorOtherBooks(authorId: string, excludeBookId?: string | null) {
    return db.book.findMany({
      where: {
        authorId,
        ...(excludeBookId ? { id: { not: excludeBookId } } : {}),
      },
      select: {
        id: true,
        title: true,
        status: true,
        copiesSold: true,
        royaltyEarned: true,
      },
      orderBy: { copiesSold: "desc" },
    });
  },

  async updateAdminTicket(id: string, data: UpdateAdminTicketData) {
    const updateData: Prisma.TicketUncheckedUpdateInput = {
      updatedAt: new Date(),
    };

    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === "RESOLVED") {
        updateData.resolvedAt = new Date();
      } else if (data.status === "OPEN" || data.status === "IN_PROGRESS") {
        updateData.resolvedAt = null;
      }
    }

    if (data.category !== undefined) {
      updateData.category = data.category;
      updateData.categorySource = "MANUAL";
    }

    if (data.priority !== undefined) {
      updateData.priority = data.priority;
      updateData.prioritySource = "MANUAL";
      updateData.priorityRank = PRIORITY_RANKS[data.priority];
    }

    if (data.assigneeId !== undefined) {
      updateData.assigneeId = data.assigneeId;
    }

    return db.ticket.update({
      where: { id },
      data: updateData,
    });
  },

  async addAdminReply(ticketId: string, adminId: string, body: string) {
    return db.$transaction(async (tx) => {
      const message = await tx.ticketMessage.create({
        data: {
          ticketId,
          senderId: adminId,
          senderRole: "ADMIN",
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

      const ticket = await tx.ticket.findUnique({
        where: { id: ticketId },
        select: { status: true },
      });

      const nextStatus = ticket?.status === "OPEN" ? "IN_PROGRESS" : ticket?.status;

      await tx.ticket.update({
        where: { id: ticketId },
        data: {
          ...(nextStatus && nextStatus !== ticket?.status ? { status: nextStatus } : {}),
          updatedAt: new Date(),
        },
      });

      return message;
    });
  },

  async addInternalNote(ticketId: string, adminId: string, body: string) {
    return db.$transaction(async (tx) => {
      const note = await tx.internalNote.create({
        data: {
          ticketId,
          adminId,
          body,
        },
        include: {
          admin: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      await tx.ticket.update({
        where: { id: ticketId },
        data: { updatedAt: new Date() },
      });

      return note;
    });
  },
};

const PRIORITY_RANKS: Record<TicketPriority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export type UpdateAdminTicketData = {
  status?: TicketStatus;
  category?: TicketCategory;
  priority?: TicketPriority;
  assigneeId?: string | null;
};
