import { connection } from "next/server";
import { db } from "@/server/db";
import { apiHandler } from "@/server/http/apiHandler";

/** Liveness + dependency status. Used by uptime pings (also keeps the free Supabase project awake). */
export const GET = apiHandler(async () => {
  await connection(); // always evaluate at request time (never prerendered)

  const database = await db.$queryRaw`SELECT 1`.then(
    () => "up" as const,
    () => "down" as const,
  );
  const ai = process.env.GEMINI_API_KEY && process.env.AI_FORCE_FAIL !== "true" ? "configured" : "disabled";

  return Response.json(
    { status: database === "up" ? "ok" : "degraded", database, ai, time: new Date().toISOString() },
    { status: database === "up" ? 200 : 503 },
  );
});
