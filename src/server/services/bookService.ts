import "server-only";
import type { Book } from "@/generated/prisma/client";
import { today } from "@/server/clock";
import { bookRepo } from "@/server/repositories/bookRepo";
import type { BookDto, MyBooksResponse } from "@/shared/dto";
import { productionInfo } from "@/shared/production";
import { isBelowPayoutThreshold, nextPayout } from "@/shared/royalty";

const isoDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export function toBookDto(b: Book): BookDto {
  const { published, stage, stageIndex } = productionInfo(b.status);
  return {
    id: b.id,
    title: b.title,
    isbn: b.isbn,
    genre: b.genre,
    publicationDate: isoDate(b.publicationDate),
    status: b.status,
    published,
    stage,
    stageIndex,
    mrp: b.mrp,
    royaltyPerCopy: b.royaltyPerCopy,
    copiesSold: b.copiesSold,
    royaltyEarned: b.royaltyEarned,
    royaltyPaid: b.royaltyPaid,
    royaltyPending: b.royaltyPending,
    lastPayoutDate: isoDate(b.lastPayoutDate),
    printPartner: b.printPartner,
    availableOn: b.availableOn,
  };
}

export function summarise(books: BookDto[], now: Date): MyBooksResponse["summary"] {
  const sum = (pick: (b: BookDto) => number) => books.reduce((t, b) => t + pick(b), 0);
  const pending = sum((b) => b.royaltyPending);
  const payout = nextPayout(now);
  return {
    earned: sum((b) => b.royaltyEarned),
    paid: sum((b) => b.royaltyPaid),
    pending,
    belowThreshold: isBelowPayoutThreshold(pending),
    nextPayout: { quarterLabel: payout.quarterLabel, payoutBy: isoDate(payout.payoutBy)! },
  };
}

export const bookService = {
  async listForAuthor(authorId: string): Promise<MyBooksResponse> {
    const books = (await bookRepo.listByAuthor(authorId)).map(toBookDto);
    return { books, summary: summarise(books, today()) };
  },
};
