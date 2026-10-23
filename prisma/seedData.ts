// Pure mapping from the provided dataset (snake_case JSON) to Prisma inputs.
// Kept separate from seed.ts so it can be unit-tested without a database.

export type RawBook = {
  book_id: string;
  title: string;
  isbn: string;
  genre: string;
  publication_date: string | null;
  status: string;
  mrp: number | null;
  author_royalty_per_copy: number | null;
  total_copies_sold: number;
  total_royalty_earned: number;
  royalty_paid: number;
  royalty_pending: number;
  last_royalty_payout_date: string | null;
  print_partner: string | null;
  available_on: string[];
};

export type RawAuthor = {
  author_id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  joined_date: string;
  books: RawBook[];
};

export type RawDataset = { authors: RawAuthor[] };

/** Dates in the dataset are calendar dates; store them at UTC midnight so they never shift a day. */
const toDate = (d: string | null) => (d ? new Date(`${d}T00:00:00.000Z`) : null);

export function mapAuthor(a: RawAuthor) {
  return {
    id: a.author_id,
    name: a.name,
    email: a.email.toLowerCase(),
    phone: a.phone,
    city: a.city,
    joinedDate: toDate(a.joined_date)!,
  };
}

export function mapBook(b: RawBook, authorId: string) {
  return {
    id: b.book_id,
    authorId,
    title: b.title,
    isbn: b.isbn,
    genre: b.genre,
    publicationDate: toDate(b.publication_date),
    status: b.status,
    mrp: b.mrp,
    royaltyPerCopy: b.author_royalty_per_copy,
    copiesSold: b.total_copies_sold,
    royaltyEarned: b.total_royalty_earned,
    royaltyPaid: b.royalty_paid,
    royaltyPending: b.royalty_pending,
    lastPayoutDate: toDate(b.last_royalty_payout_date),
    printPartner: b.print_partner,
    availableOn: b.available_on,
  };
}

/** Demo admin accounts (credentials are documented in the README). */
export const ADMIN_USERS = [
  { email: "admin@bookleaf.com", name: "Aarav Mehta (Support Lead)" },
  { email: "ops@bookleaf.com", name: "Nisha Rao (Operations)" },
] as const;

export const DEMO_AUTHOR_PASSWORD = "Author@123";
export const DEMO_ADMIN_PASSWORD = "Admin@123";
