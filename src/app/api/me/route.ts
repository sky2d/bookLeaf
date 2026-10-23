import { db } from "@/server/db";
import { AppError } from "@/server/http/AppError";
import { withAuth } from "@/server/http/withAuth";

/** GET /api/me — the signed-in user's profile plus the realtime channels they may listen on. */
export const GET = withAuth(async (_req, { user }) => {
  const record = await db.user.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, email: true, role: true, authorId: true, realtimeKey: true },
  });
  if (!record) throw AppError.unauthorized("Your account no longer exists. Please sign in again.");

  const { realtimeKey, ...profile } = record;
  const channels = [`u:${realtimeKey}`];
  if (record.role === "ADMIN" && process.env.ADMIN_REALTIME_KEY) channels.push(`a:${process.env.ADMIN_REALTIME_KEY}`);

  return Response.json({ user: profile, realtime: { channels } });
});
