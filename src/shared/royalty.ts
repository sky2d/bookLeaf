// Royalty policy from the BookLeaf Knowledge Base, as pure functions.
// Shared by the author UI and the AI prompt builder so both state the same facts.
//  - Royalties are calculated quarterly and paid within 45 days of the quarter ending.
//  - Minimum payout is ₹1,000; smaller accumulated balances roll over to the next quarter.

export const PAYOUT_THRESHOLD_INR = 1000;
export const PAYOUT_WINDOW_DAYS = 45;

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Last day of the calendar quarter containing `date` (UTC). */
export function quarterEndOf(date: Date): Date {
  const q = Math.floor(date.getUTCMonth() / 3);
  return new Date(Date.UTC(date.getUTCFullYear(), q * 3 + 3, 0));
}

function previousQuarterEnd(date: Date): Date {
  const q = Math.floor(date.getUTCMonth() / 3);
  return new Date(Date.UTC(date.getUTCFullYear(), q * 3, 0));
}

const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY_MS);

export type PayoutWindow = {
  /** First and last day of the sales quarter this payout covers. */
  quarterStart: Date;
  quarterEnd: Date;
  /** Latest date the payout should arrive (quarter end + 45 days). */
  payoutBy: Date;
  /** e.g. "Jul–Sep 2026" */
  quarterLabel: string;
};

function windowFor(quarterEnd: Date): PayoutWindow {
  const quarterStart = new Date(Date.UTC(quarterEnd.getUTCFullYear(), quarterEnd.getUTCMonth() - 2, 1));
  const label = `${MONTHS[quarterStart.getUTCMonth()]}–${MONTHS[quarterEnd.getUTCMonth()]} ${quarterEnd.getUTCFullYear()}`;
  return { quarterStart, quarterEnd, payoutBy: addDays(quarterEnd, PAYOUT_WINDOW_DAYS), quarterLabel: label };
}

/**
 * The next payout an author should expect as of `today`.
 * If the previous quarter's 45-day window is still open, that payout is next;
 * otherwise it's the current quarter's payout.
 */
export function nextPayout(today: Date): PayoutWindow {
  const prev = windowFor(previousQuarterEnd(today));
  return today.getTime() <= prev.payoutBy.getTime() ? prev : windowFor(quarterEndOf(today));
}

/** True when an author has royalties owed but below the minimum payout (they roll over). */
export function isBelowPayoutThreshold(totalPending: number): boolean {
  return totalPending > 0 && totalPending < PAYOUT_THRESHOLD_INR;
}
