import type { Role } from "@/generated/prisma/enums";

/** Where each role lands after signing in. */
export function homePathFor(role: Role): string {
  return role === "ADMIN" ? "/admin/tickets" : "/author/books";
}

/**
 * Sanitises a post-login `?next=` value so it can't be used as an open redirect.
 * Resolving it the way a browser would catches tricks like `/\evil.com`, which a prefix check misses.
 */
export function safeNextPath(next: string | string[] | undefined): string {
  if (typeof next !== "string") return "/";
  const base = "http://same.site";
  const url = new URL(next, base);
  return url.origin === base ? url.pathname + url.search : "/";
}
