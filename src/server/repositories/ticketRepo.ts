import "server-only";
import type { Role } from "@/generated/prisma/enums";
import { db } from "@/server/db";

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
};
