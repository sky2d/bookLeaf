import "server-only";
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
};
