"use client";

import { formatCount, formatDate, formatINR } from "@/lib/format";
import type { AdminTicketDetailDto } from "@/shared/dto";

export function AuthorContextSidebar({ ticket }: { ticket: AdminTicketDetailDto }) {
  const author = ticket.author;
  const book = ticket.book;
  const otherBooks = ticket.authorOtherBooks;

  return (
    <div className="space-y-5">
      {/* Author Profile Card */}
      <div className="rounded-lg border border-rule bg-surface p-5 shadow-xs">
        <h3 className="font-serif text-base font-semibold text-ink">Author Context</h3>
        <div className="mt-3 space-y-2 text-xs">
          <div>
            <span className="text-ink-faint">Name:</span>{" "}
            <span className="font-medium text-ink">{author.name}</span>
            <span className="ml-1 text-[11px] text-ink-faint">({author.id})</span>
          </div>
          <div>
            <span className="text-ink-faint">Email:</span>{" "}
            <a href={`mailto:${author.email}`} className="text-cloth hover:underline">
              {author.email}
            </a>
          </div>
          <div>
            <span className="text-ink-faint">Phone:</span>{" "}
            <span className="text-ink">{author.phone}</span>
          </div>
          <div>
            <span className="text-ink-faint">City:</span>{" "}
            <span className="text-ink">{author.city}</span>
          </div>
          <div>
            <span className="text-ink-faint">Joined:</span>{" "}
            <span className="text-ink">{formatDate(author.joinedDate)}</span>
          </div>
        </div>
      </div>

      {/* Referenced Book Card */}
      {book ? (
        <div className="rounded-lg border border-rule bg-surface p-5 shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-serif text-base font-semibold text-ink">Referenced Book</h3>
            <span className="rounded-sm bg-cloth-soft px-1.5 py-0.5 text-[10px] font-medium text-cloth">
              {book.id}
            </span>
          </div>

          <p className="mt-2 text-sm font-medium text-ink">{book.title}</p>
          <p className="text-xs text-ink-faint">
            {book.genre} • ISBN: {book.isbn}
          </p>

          <div className="mt-3 inline-block rounded-full bg-paper px-2.5 py-0.5 text-xs font-medium text-ink-soft">
            Status: {book.status}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-rule/60 pt-3 text-xs">
            <div>
              <p className="text-ink-faint">MRP / Royalty</p>
              <p className="tabular font-medium text-ink">
                {formatINR(book.mrp)} / {formatINR(book.royaltyPerCopy)}
              </p>
            </div>
            <div>
              <p className="text-ink-faint">Copies Sold</p>
              <p className="tabular font-medium text-ink">{formatCount(book.copiesSold)}</p>
            </div>
            <div>
              <p className="text-ink-faint">Royalty Earned</p>
              <p className="tabular font-medium text-ink">{formatINR(book.royaltyEarned)}</p>
            </div>
            <div>
              <p className="text-ink-faint">Royalty Pending</p>
              <p className="tabular font-medium text-amber">{formatINR(book.royaltyPending)}</p>
            </div>
            <div>
              <p className="text-ink-faint">Royalty Paid</p>
              <p className="tabular font-medium text-leaf">{formatINR(book.royaltyPaid)}</p>
            </div>
            <div>
              <p className="text-ink-faint">Last Payout</p>
              <p className="text-ink">{formatDate(book.lastPayoutDate)}</p>
            </div>
          </div>

          {book.printPartner && (
            <p className="mt-3 text-[11px] text-ink-faint">
              Print Partner: <span className="text-ink-soft">{book.printPartner}</span>
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-rule bg-surface/50 p-4 text-center text-xs text-ink-faint">
          General inquiry (no specific book referenced)
        </div>
      )}

      {/* Other Books Card */}
      {otherBooks && otherBooks.length > 0 && (
        <div className="rounded-lg border border-rule bg-surface p-5 shadow-xs">
          <h3 className="font-serif text-sm font-semibold text-ink">
            Other Books by Author ({otherBooks.length})
          </h3>
          <div className="mt-3 divide-y divide-rule/60">
            {otherBooks.map((ob) => (
              <div key={ob.id} className="py-2 text-xs first:pt-0 last:pb-0">
                <p className="font-medium text-ink">{ob.title}</p>
                <div className="flex items-center justify-between text-[11px] text-ink-faint">
                  <span>{ob.status}</span>
                  <span className="tabular">
                    {formatCount(ob.copiesSold)} sold • {formatINR(ob.royaltyEarned)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
