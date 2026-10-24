import "server-only";
import { db } from "@/server/db";

export const userRepo = {
  /** The admin with this id, or null if no such user exists or they are not an admin. */
  findAdmin(id: string) {
    return db.user.findFirst({ where: { id, role: "ADMIN" }, select: { id: true } });
  },
};
