import { formatDate, formatINR } from "@/lib/format";
import type { RoyaltySummaryDto } from "@/shared/dto";

/** Account-level royalty position: earned = paid + pending, drawn as one split bar. */
export function RoyaltySummary({ summary }: { summary: RoyaltySummaryDto }) {
  const { earned, paid, pending } = summary;
  const paidPct = earned > 0 ? (paid / earned) * 100 : 0;

  return (
    <section aria-labelledby="royalty-heading" className="rounded-md border border-rule bg-surface p-5 sm:p-6">
      <h2 id="royalty-heading" className="text-base font-semibold">
        Royalties across all your books
      </h2>

      <dl className="mt-4 grid grid-cols-3 gap-4 tabular">
        <div>
          <dt className="text-sm text-ink-soft">Earned</dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight">{formatINR(earned)}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-sm text-ink-soft">
            <span className="size-2 rounded-full bg-leaf" aria-hidden="true" /> Paid to you
          </dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight">{formatINR(paid)}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-sm text-ink-soft">
            <span className="size-2 rounded-full bg-amber" aria-hidden="true" /> Pending
          </dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight">{formatINR(pending)}</dd>
        </div>
      </dl>

      {earned > 0 && (
        <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-amber/70" aria-hidden="true">
          <div className="bg-leaf" style={{ width: `${paidPct}%` }} />
        </div>
      )}

      <p className="mt-4 max-w-prose text-sm text-ink-soft">
        {earned === 0 ? (
          <>Royalties start once your first book is published and selling. They&apos;re calculated every quarter.</>
        ) : summary.belowThreshold ? (
          <>
            Your pending {formatINR(pending)} is under the ₹1,000 minimum payout, so it rolls over and is paid once it
            crosses ₹1,000.
          </>
        ) : pending > 0 ? (
          <>
            Royalties are paid quarterly. Your {summary.nextPayout.quarterLabel} royalties should reach your bank account
            by <strong className="font-medium text-ink">{formatDate(summary.nextPayout.payoutBy)}</strong>.
          </>
        ) : (
          <>You&apos;re all paid up. Royalties are calculated quarterly and paid within 45 days of each quarter ending.</>
        )}
      </p>
    </section>
  );
}
