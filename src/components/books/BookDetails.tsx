import Link from "next/link";
import { EMPTY, formatCount, formatDate, formatINR } from "@/lib/format";
import type { BookDto } from "@/shared/dto";
import { ProductionProgress } from "./ProductionProgress";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-rule py-2 last:border-b-0">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="text-right tabular">{children}</dd>
    </div>
  );
}

function payoutNote(b: BookDto) {
  if (!b.published) return null;
  if (b.royaltyPending === 0 && b.royaltyPaid > 0) return { tone: "text-leaf", text: "All paid up" };
  if (!b.lastPayoutDate && b.royaltyPending > 0) return { tone: "text-amber", text: "No payout yet" };
  return null;
}

export function BookDetails({ book: b }: { book: BookDto }) {
  const note = payoutNote(b);

  return (
    <article id={b.id} className="scroll-mt-6 border-t border-rule py-8 first:border-t-0">
      <div className="grid gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="min-w-0">
          <h3 className="font-serif text-2xl leading-snug font-semibold tracking-tight">{b.title}</h3>
          <p className="mt-1 text-ink-soft">{b.genre}</p>

          {b.published ? (
            <p className="mt-4 inline-flex items-center gap-2 rounded-sm bg-leaf-soft px-2 py-1 text-sm text-leaf">
              <span className="size-1.5 rounded-full bg-leaf" aria-hidden="true" />
              {b.status}
            </p>
          ) : (
            <div className="mt-4">
              <p className="mb-3 text-[15px]">
                In production, currently at <strong className="font-medium">{b.stage}</strong>. Sales and royalties start
                once it&apos;s published.
              </p>
              <ProductionProgress stage={b.stage} stageIndex={b.stageIndex} />
            </div>
          )}

          <dl className="mt-6 grid max-w-md grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
            <dt className="text-ink-soft">ISBN</dt>
            <dd className="tabular">{b.isbn}</dd>
            <dt className="text-ink-soft">Published</dt>
            <dd>{formatDate(b.publicationDate)}</dd>
            <dt className="text-ink-soft">MRP</dt>
            <dd className="tabular">{formatINR(b.mrp)}</dd>
            <dt className="text-ink-soft">Printed by</dt>
            <dd>{b.printPartner ?? EMPTY}</dd>
            <dt className="text-ink-soft">Available on</dt>
            <dd>{b.availableOn.length ? b.availableOn.join(", ") : "Not listed yet"}</dd>
          </dl>

          <Link
            href={`/author/tickets/new?book=${b.id}`}
            className="mt-6 inline-block text-sm font-medium text-cloth underline-offset-4 hover:underline"
          >
            Ask about this book
          </Link>
        </div>

        <div>
          <h4 className="mb-1 text-sm font-semibold">Sales and royalties</h4>
          <dl className="text-sm">
            <Row label="Copies sold">{formatCount(b.copiesSold)}</Row>
            <Row label="Royalty per copy">{formatINR(b.royaltyPerCopy)}</Row>
            <Row label="Total earned">{formatINR(b.royaltyEarned)}</Row>
            <Row label="Paid to you">{formatINR(b.royaltyPaid)}</Row>
            <Row label="Pending">
              <span className={b.royaltyPending > 0 ? "font-medium text-amber" : ""}>{formatINR(b.royaltyPending)}</span>
            </Row>
            <Row label="Last payout">{b.lastPayoutDate ? formatDate(b.lastPayoutDate) : "None yet"}</Row>
          </dl>
          {note && <p className={`mt-2 text-sm font-medium ${note.tone}`}>{note.text}</p>}
        </div>
      </div>
    </article>
  );
}
