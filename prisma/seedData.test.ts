import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { mapAuthor, mapBook, type RawDataset } from "./seedData";

const dataset: RawDataset = JSON.parse(
  readFileSync(join(import.meta.dirname, "data", "bookleaf_sample_data.json"), "utf8"),
);
const allBooks = dataset.authors.flatMap((a) => a.books.map((b) => mapBook(b, a.author_id)));

describe("seed dataset mapping", () => {
  it("contains exactly the 10 authors and 18 books from the brief", () => {
    expect(dataset.authors).toHaveLength(10);
    expect(allBooks).toHaveLength(18);
  });

  it("keeps the source IDs as primary keys", () => {
    expect(mapAuthor(dataset.authors[0]).id).toBe("AUTH001");
    expect(allBooks[0].id).toBe("BK001");
  });

  it("preserves nulls for books still in production", () => {
    const bk013 = allBooks.find((b) => b.id === "BK013")!;
    expect(bk013).toMatchObject({
      status: "In Production - Cover Design",
      mrp: null,
      royaltyPerCopy: null,
      publicationDate: null,
      printPartner: null,
      availableOn: [],
    });
  });

  it("stores calendar dates at UTC midnight (no off-by-one day)", () => {
    const bk001 = allBooks.find((b) => b.id === "BK001")!;
    expect(bk001.publicationDate?.toISOString()).toBe("2023-06-20T00:00:00.000Z");
    expect(bk001.lastPayoutDate?.toISOString()).toBe("2025-10-15T00:00:00.000Z");
  });

  it("royalty figures are internally consistent (earned = paid + pending)", () => {
    for (const b of allBooks) expect(b.royaltyPaid + b.royaltyPending).toBe(b.royaltyEarned);
  });
});
