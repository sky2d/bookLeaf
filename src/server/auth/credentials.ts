import "server-only";
import bcrypt from "bcryptjs";
import { db } from "@/server/db";
import { loginSchema } from "@/shared/schemas/auth";
import type { SessionUser } from "./types";

// Compared against when the email is unknown, so "no such user" and "wrong password"
// take the same time and can't be told apart (prevents account enumeration).
const DUMMY_HASH = "$2b$10$CwTycUXWue0Thq9StjUM0uJ8.ixsH0Va4p9eQIIHjHtAfDUpVrw6e";

/** Auth.js Credentials `authorize` implementation. Returns null for any failure — never throws on bad input. */
export async function authorizeCredentials(raw: unknown): Promise<SessionUser | null> {
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return null;

  const { email, password } = parsed.data;
  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) return null;

  return { id: user.id, name: user.name, email: user.email, role: user.role, authorId: user.authorId };
}
