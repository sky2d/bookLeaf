import "server-only";
import { db } from "@/server/db";

export const bookRepo = {
  /** Every query is scoped by authorId — callers pass the id from the session, never from the request. */
  listByAuthor(authorId: string) {
    return db.book.findMany({
      where: { authorId },
      orderBy: [{ publicationDate: { sort: "desc", nulls: "first" } }, { id: "asc" }],
    });
  },

  findOwned(authorId: string, bookId: string) {
    return db.book.findFirst({ where: { id: bookId, authorId } });
  },
};
