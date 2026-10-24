import "server-only";
import { db } from "@/server/db";

export type InvalidationPayload = {
  type: "ticket.created" | "ticket.updated" | "ticket.reply" | "ticket.message" | "ticket.note";
  ticketId: string;
};

/**
 * Sends a real-time invalidation ping over Supabase Realtime Broadcast.
 * Carries NO customer or ticket content — only { type, ticketId } to trigger REST refetch.
 * Catches all errors so broadcasting never fails or blocks the calling transaction.
 */
export async function broadcastInvalidation(
  topics: (string | null | undefined)[],
  payload: InvalidationPayload,
): Promise<{ ok: boolean; error?: string }> {
  const validTopics = Array.from(new Set(topics.filter((t): t is string => Boolean(t && t.trim()))));
  if (validTopics.length === 0) {
    return { ok: true };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn("[realtime] broadcast skipped: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set");
    return { ok: false, error: "Missing Supabase configuration" };
  }

  const endpoint = `${supabaseUrl.replace(/\/$/, "")}/realtime/v1/api/broadcast`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        messages: validTopics.map((topic) => ({
          topic,
          event: "invalidate",
          payload,
        })),
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(`[realtime] broadcast returned HTTP ${res.status}:`, errText);
      return { ok: false, error: `HTTP ${res.status}` };
    }

    return { ok: true };
  } catch (err) {
    console.warn("[realtime] broadcast request failed:", err instanceof Error ? err.message : err);
    return { ok: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

/** Looks up an author user's unguessable realtimeKey channel */
export async function getAuthorChannel(authorId: string): Promise<string | null> {
  try {
    const user = await db.user.findUnique({
      where: { authorId },
      select: { realtimeKey: true },
    });
    return user?.realtimeKey ? `u:${user.realtimeKey}` : null;
  } catch {
    return null;
  }
}

/** Returns the admin broadcast channel topic */
export function getAdminChannel(): string | null {
  const adminKey = process.env.ADMIN_REALTIME_KEY;
  return adminKey ? `a:${adminKey}` : null;
}

/**
 * Notifies both the author and the admin channels that a ticket has been created, updated, or replied to.
 */
export async function notifyTicketUpdated(
  ticketId: string,
  authorId: string,
  type: "ticket.created" | "ticket.updated" | "ticket.reply" | "ticket.message",
): Promise<void> {
  const authorChannel = await getAuthorChannel(authorId);
  const adminChannel = getAdminChannel();

  await broadcastInvalidation([authorChannel, adminChannel], { type, ticketId });
}

/**
 * Notifies only admin channels (for private internal notes).
 */
export async function notifyAdminOnly(ticketId: string, type: "ticket.note"): Promise<void> {
  const adminChannel = getAdminChannel();
  await broadcastInvalidation([adminChannel], { type, ticketId });
}
