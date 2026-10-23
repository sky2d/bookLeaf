import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
vi.mock("@/server/db", () => ({ db: { user: { findUnique: (...a: unknown[]) => findUnique(...a) } } }));

const { authorizeCredentials } = await import("./credentials");

const passwordHash = bcrypt.hashSync("Author@123", 4);
const dbUser = { id: "u1", name: "Priya Sharma", email: "priya.sharma@email.com", role: "AUTHOR", authorId: "AUTH001", passwordHash };

describe("authorizeCredentials", () => {
  beforeEach(() => findUnique.mockReset());

  it("returns the session user for valid credentials (email is case-insensitive)", async () => {
    findUnique.mockResolvedValue(dbUser);
    const user = await authorizeCredentials({ email: "Priya.Sharma@email.com", password: "Author@123" });
    expect(findUnique).toHaveBeenCalledWith({ where: { email: "priya.sharma@email.com" } });
    expect(user).toEqual({ id: "u1", name: "Priya Sharma", email: "priya.sharma@email.com", role: "AUTHOR", authorId: "AUTH001" });
  });

  it("returns null for a wrong password", async () => {
    findUnique.mockResolvedValue(dbUser);
    expect(await authorizeCredentials({ email: dbUser.email, password: "nope" })).toBeNull();
  });

  it("returns null for an unknown email (still runs a bcrypt compare)", async () => {
    findUnique.mockResolvedValue(null);
    const spy = vi.spyOn(bcrypt, "compare");
    expect(await authorizeCredentials({ email: "ghost@x.com", password: "whatever" })).toBeNull();
    expect(spy).toHaveBeenCalled();
  });

  it("returns null for malformed input without touching the database", async () => {
    expect(await authorizeCredentials({ email: "not-an-email" })).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });
});
