import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Role } from "@/generated/prisma/enums";
import { homePathFor } from "@/shared/routes";

/**
 * Server-side gate for portal layouts. The proxy already redirects optimistically;
 * this re-checks the session where the page actually renders.
 */
export async function requirePortal(role: Role) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== role) redirect(homePathFor(session.user.role));
  return session.user;
}
