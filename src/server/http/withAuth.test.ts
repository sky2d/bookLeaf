import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: () => authMock() }));

const { withAuth, requireAuthorId } = await import("./withAuth");

const req = new Request("http://test/api/x") as unknown as NextRequest;
const author = { id: "u1", name: "Priya", email: "p@x.com", role: "AUTHOR" as const, authorId: "AUTH001" };
const admin = { id: "u2", name: "Admin", email: "a@x.com", role: "ADMIN" as const, authorId: null };

describe("withAuth", () => {
  beforeEach(() => authMock.mockReset());

  it("returns 401 JSON when there is no session", async () => {
    authMock.mockResolvedValue(null);
    const res = await withAuth(async () => Response.json({ ok: true }))(req);
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("UNAUTHORIZED");
  });

  it("returns 403 when the role is not allowed", async () => {
    authMock.mockResolvedValue({ user: author });
    const res = await withAuth(async () => Response.json({ ok: true }), { roles: ["ADMIN"] })(req);
    expect(res.status).toBe(403);
  });

  it("passes the session user and awaited params to the handler", async () => {
    authMock.mockResolvedValue({ user: admin });
    const handler = vi.fn(async () => Response.json({ ok: true }));
    const res = await withAuth<{ id: string }>(handler, { roles: ["ADMIN"] })(req, {
      params: Promise.resolve({ id: "t1" }),
    });
    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(req, { user: admin, params: { id: "t1" } });
  });
});

describe("requireAuthorId", () => {
  it("returns the authorId for authors", () => {
    expect(requireAuthorId(author)).toBe("AUTH001");
  });
  it("rejects admins", () => {
    expect(() => requireAuthorId(admin)).toThrowError(/only available to authors/);
  });
});
