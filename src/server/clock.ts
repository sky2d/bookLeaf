import "server-only";

/** "Today" for policy maths. APP_TODAY (YYYY-MM-DD) pins it for demos/tests; otherwise the real date. */
export function today(): Date {
  const pinned = process.env.APP_TODAY;
  if (pinned && /^\d{4}-\d{2}-\d{2}$/.test(pinned)) return new Date(`${pinned}T00:00:00.000Z`);
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
