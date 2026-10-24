import type { Metadata } from "next";
import Link from "next/link";
import { NewTicketForm } from "./NewTicketForm";

export const metadata: Metadata = {
  title: "Raise a query · BookLeaf",
};

type Props = {
  searchParams: Promise<{ book?: string | string[] }>;
};

export default async function NewTicketPage(props: Props) {
  const searchParams = await props.searchParams;
  const rawBook = Array.isArray(searchParams.book) ? searchParams.book[0] : searchParams.book;
  const preselectedBookId = typeof rawBook === "string" ? rawBook : undefined;

  return (
    <div className="mx-auto max-w-2xl">
      <nav className="mb-4 text-sm text-ink-soft">
        <Link href="/author/books" className="hover:text-ink underline-offset-4 hover:underline">
          ← Back to My books
        </Link>
      </nav>

      <header className="mb-8">
        <h1 className="font-serif text-[32px] leading-tight font-semibold tracking-tight text-ink">
          Raise a support query
        </h1>
        <p className="mt-2 text-ink-soft">
          Have a question about your books, royalties, or production? Submit your request below and our team will get back
          to you.
        </p>
      </header>

      <div className="rounded-lg border border-rule bg-surface p-6 sm:p-8">
        <NewTicketForm preselectedBookId={preselectedBookId} />
      </div>
    </div>
  );
}
