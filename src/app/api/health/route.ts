import { connection } from "next/server";
import { apiHandler } from "@/server/http/apiHandler";

export const GET = apiHandler(async () => {
  await connection(); // always evaluate at request time (never prerendered)
  return Response.json({ status: "ok", time: new Date().toISOString() });
});
