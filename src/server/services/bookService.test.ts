import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Book } from "@/generated/prisma/client";

const listByAuthor = vi.fn();
vi.mock("@/server/repositories/bookRepo", () => ({ bookRepo: { listByAuthor: (id: string) => listByAuthor(id) } }));
vi.mock("@/server/clock", () => ({ today: () => new Date("2026-10-23T00:00:00.000Z") }));

const { bookService, summarise, toBookDto } = await import("./bookService");

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

function book(overrides: Partial<Book>): Book {
  return {
    id: "BK000",
    authorId: "AUTH000",
    title: "Untitled",
    isbn: "978-0-00-000000-0",
    genre: "Fiction",
    publicationDate: d("2024-01-15"),
    status: "Published & Live",
    mrp: 299,
    royaltyPerCopy: 45,
    copiesSold: 100,
    royaltyEarned: 4500,
    royaltyPaid: 4500,
    royaltyPending: 0,
    lastPayoutDate: d("2025-12-01"),
    printPartner: "Repro India",
    availableOn: ["Amazon"],
    ...overrides,
  };
}

// Kavita Deshmukh (AUTH009): one book in production, one with ₹850 pending and never paid.
const bk015 = book({
  id: "BK015",
  authorId: "AUTH009",
  status: "In Production - Typesetting",
  publicationDate: null,
  mrp: null,
  royaltyPerCopy: null,
  copiesSold: 0,
  royaltyEarned: 0,
  royaltyPaid: 0,
  lastPayoutDate: null,
  printPartner: null,
  availableOn: [],
});
const bk016 = book({ id: "BK016", authorId: "AUTH009", royaltyEarned: 850, royaltyPaid: 0, royaltyPending: 850, lastPayoutDate: null });

describe("toBookDto", () => {
  it("keeps nulls for a book still in production and parses its stage", () => {
    const dto = toBookDto(bk015);
    expect(dto).toMatchObject({
      published: false,
      stage: "Typesetting",
      stageIndex: 3,
      publicationDate: null,
      mrp: null,
      royaltyPerCopy: null,
      printPartner: null,
      lastPayoutDate: null,
      availableOn: [],
    });
  });

  it("serialises calendar dates as YYYY-MM-DD", () => {
    const dto = toBookDto(book({}));
    expect(dto.publicationDate).toBe("2024-01-15");
    expect(dto.lastPayoutDate).toBe("2025-12-01");
    expect(dto.published).toBe(true);
  });
});

describe("summarise", () => {
  it("totals royalties and flags a balance under the ₹1,000 minimum", () => {
    const summary = summarise([bk015, bk016].map(toBookDto), d("2026-10-23"));
    expect(summary).toEqual({
      earned: 850,
      paid: 0,
      pending: 850,
      belowThreshold: true,
      nextPayout: { quarterLabel: "Jul–Sep 2026", payoutBy: "2026-11-14" },
    });
  });

  it("is not below the threshold once the total crosses ₹1,000, even if one book is under it", () => {
    const summary = summarise([bk016, book({ id: "BK017", royaltyPending: 400 })].map(toBookDto), d("2026-10-23"));
    expect(summary.pending).toBe(1250);
    expect(summary.belowThreshold).toBe(false);
  });

  it("is not below the threshold when nothing is pending", () => {
    expect(summarise([book({})].map(toBookDto), d("2026-10-23")).belowThreshold).toBe(false);
  });
});

describe("bookService.listForAuthor", () => {
  beforeEach(() => listByAuthor.mockReset());

  it("queries only the given author's books and uses today's date for the payout", async () => {
    listByAuthor.mockResolvedValue([bk015, bk016]);
    const res = await bookService.listForAuthor("AUTH009");
    expect(listByAuthor).toHaveBeenCalledExactlyOnceWith("AUTH009");
    expect(res.books.map((b) => b.id)).toEqual(["BK015", "BK016"]);
    expect(res.summary.nextPayout.payoutBy).toBe("2026-11-14");
  });

  it("returns an empty list with zero totals for an author with no books", async () => {
    listByAuthor.mockResolvedValue([]);
    const res = await bookService.listForAuthor("AUTH999");
    expect(res.books).toEqual([]);
    expect(res.summary).toMatchObject({ earned: 0, paid: 0, pending: 0, belowThreshold: false });
  });
});
