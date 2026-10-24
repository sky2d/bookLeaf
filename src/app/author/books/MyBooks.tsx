"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { BookDetails } from "@/components/books/BookDetails";
import { BookShelf } from "@/components/books/BookShelf";
import { RoyaltySummary } from "@/components/books/RoyaltySummary";
import { ErrorBlock, LoadingBlock } from "@/components/ui/States";
import { api } from "@/lib/apiClient";
import type { MyBooksResponse } from "@/shared/dto";

export const myBooksQuery = { queryKey: ["me", "books"], queryFn: () => api<MyBooksResponse>("/api/me/books") };

export function MyBooks() {
  const { data, error, isPending, refetch } = useQuery(myBooksQuery);

  if (isPending) return <LoadingBlock label="Loading your books" lines={4} />;
  if (error) return <ErrorBlock message="We couldn't load your books just now." onRetry={() => refetch()} />;

  if (data.books.length === 0) {
    return (
      <div className="max-w-prose">
        <p className="text-ink-soft">
          You don&apos;t have any books with us yet. Once your manuscript is received, you&apos;ll follow it here from
          editing to publication.
        </p>
        <Link href="/author/tickets/new" className="mt-4 inline-block font-medium text-cloth hover:underline">
          Ask the BookLeaf team a question
        </Link>
      </div>
    );
  }

  const published = data.books.filter((b) => b.published).length;
  const inProduction = data.books.length - published;

  return (
    <div className="flex flex-col gap-10">
      <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
        <div>
          <p className="mb-4 text-sm text-ink-soft">
            {published} published{inProduction > 0 && `, ${inProduction} in production`}
          </p>
          <BookShelf books={data.books} />
        </div>
        <RoyaltySummary summary={data.summary} />
      </div>

      <section aria-label="Book details">
        {data.books.map((b) => (
          <BookDetails key={b.id} book={b} />
        ))}
      </section>
    </div>
  );
}
