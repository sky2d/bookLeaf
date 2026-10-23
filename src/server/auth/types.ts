import type { Role } from "@/generated/prisma/enums";

/** The identity carried in the session JWT and handed to every protected route handler. */
export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** Set for authors ("AUTH001"), null for admins. */
  authorId: string | null;
};
