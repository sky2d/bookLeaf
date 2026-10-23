import type { Role } from "@/generated/prisma/enums";

/** Where each role lands after signing in. */
export function homePathFor(role: Role): string {
  return role === "ADMIN" ? "/admin/tickets" : "/author/books";
}
