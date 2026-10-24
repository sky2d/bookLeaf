import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AppError } from "./AppError";
import { apiHandler, parseBody } from "./apiHandler";

async function body(res: Response) {
  return (await res.json()) as { error: { code: string; message: string; details?: unknown } };
}

describe("apiHandler", () => {
  it("passes successful responses through", async () => {
    const res = await apiHandler(async () => Response.json({ ok: true }))();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("maps AppError to its status and code", async () => {
    const res = await apiHandler(async () => {
      throw AppError.notFound("Ticket");
    })();
    expect(res.status).toBe(404);
    expect(await body(res)).toEqual({ error: { code: "NOT_FOUND", message: "Ticket not found." } });
  });

  it("maps ZodError to 400 with field details", async () => {
    const res = await apiHandler(async () => {
      z.object({ subject: z.string().min(5) }).parse({ subject: "hi" });
      return Response.json({});
    })();
    const b = await body(res);
    expect(res.status).toBe(400);
    expect(b.error.code).toBe("VALIDATION_ERROR");
    expect(b.error.details).toEqual([expect.objectContaining({ path: "subject" })]);
  });

  it("maps Prisma P2025 to 404 and P2002 to 409", async () => {
    const notFound = await apiHandler(async () => {
      throw Object.assign(new Error("x"), { code: "P2025" });
    })();
    const dup = await apiHandler(async () => {
      throw Object.assign(new Error("x"), { code: "P2002" });
    })();
    expect(notFound.status).toBe(404);
    expect(dup.status).toBe(409);
  });

  it("maps a Prisma foreign-key failure (P2003) to 400 instead of 500", async () => {
    const res = await apiHandler(async () => {
      throw Object.assign(new Error("x"), { code: "P2003" });
    })();
    expect(res.status).toBe(400);
  });

  it("hides unexpected errors behind a generic 500", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await apiHandler(async () => {
      throw new Error("db password is hunter2");
    })();
    const b = await body(res);
    expect(res.status).toBe(500);
    expect(b.error.code).toBe("INTERNAL_ERROR");
    expect(b.error.message).not.toContain("hunter2");
    spy.mockRestore();
  });
});

describe("parseBody", () => {
  const schema = z.object({ email: z.email() });

  it("rejects malformed JSON with INVALID_JSON", async () => {
    const req = new Request("http://x", { method: "POST", body: "{not json" });
    await expect(parseBody(req, schema)).rejects.toMatchObject({ status: 400, code: "INVALID_JSON" });
  });

  it("returns typed data for valid input", async () => {
    const req = new Request("http://x", { method: "POST", body: JSON.stringify({ email: "a@b.co" }) });
    await expect(parseBody(req, schema)).resolves.toEqual({ email: "a@b.co" });
  });
});
