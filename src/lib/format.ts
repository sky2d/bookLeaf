// Display formatting. Missing values render as an em dash, never "null" or "NaN".

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const count = new Intl.NumberFormat("en-IN");
const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export const EMPTY = "—";

export function formatINR(value: number | null | undefined): string {
  return value == null || Number.isNaN(value) ? EMPTY : inr.format(value);
}

export function formatCount(value: number | null | undefined): string {
  return value == null ? EMPTY : count.format(value);
}

/** Calendar date ("2023-06-20" or full ISO) → "20 Jun 2023". */
export function formatDate(value: string | null | undefined): string {
  if (!value) return EMPTY;
  const d = new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value);
  return Number.isNaN(d.getTime()) ? EMPTY : dateFmt.format(d);
}

/** Timestamp → "23 Oct, 4:05 pm" in the viewer's timezone. */
export function formatDateTime(value: string): string {
  return dateTimeFmt.format(new Date(value));
}

/** Compact age for queues: "45m", "6h", "3d 4h". */
export function formatAge(fromIso: string, now = Date.now()): string {
  const mins = Math.max(0, Math.floor((now - new Date(fromIso).getTime()) / 60_000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const rem = hours % 24;
  return rem ? `${days}d ${rem}h` : `${days}d`;
}
