import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
vi.mock("@/server/db", () => ({
  db: {
    user: {
      findUnique: (args: unknown) => findUnique(args),
    },
  },
}));

describe("server realtime broadcast", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: "https://test-project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
      ADMIN_REALTIME_KEY: "test-admin-secret",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("sends batch broadcast messages with correct topics and payload", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
    });
    vi.stubGlobal("fetch", fetchMock);

    const { broadcastInvalidation } = await import("./broadcast");

    const res = await broadcastInvalidation(["u:key-1", "a:admin-key", "u:key-1"], {
      type: "ticket.updated",
      ticketId: "clt123",
    });

    expect(res.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://test-project.supabase.co/realtime/v1/api/broadcast",
      expect.objectContaining({
        method: "POST",
        headers: {
          apikey: "test-service-key",
          Authorization: "Bearer test-service-key",
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          messages: [
            {
              topic: "u:key-1",
              event: "invalidate",
              payload: { type: "ticket.updated", ticketId: "clt123" },
            },
            {
              topic: "a:admin-key",
              event: "invalidate",
              payload: { type: "ticket.updated", ticketId: "clt123" },
            },
          ],
        }),
      }),
    );
  });

  it("safely handles empty or null topics without calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { broadcastInvalidation } = await import("./broadcast");

    const res = await broadcastInvalidation([null, undefined, "", "   "], {
      type: "ticket.created",
      ticketId: "clt456",
    });

    expect(res.ok).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("handles missing environment variables gracefully", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { broadcastInvalidation } = await import("./broadcast");

    const res = await broadcastInvalidation(["u:key-1"], {
      type: "ticket.created",
      ticketId: "clt456",
    });

    expect(res.ok).toBe(false);
    expect(res.error).toBe("Missing Supabase configuration");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("swallows network fetch rejection without throwing", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("Network timeout"));
    vi.stubGlobal("fetch", fetchMock);

    const { broadcastInvalidation } = await import("./broadcast");

    const res = await broadcastInvalidation(["u:key-1"], {
      type: "ticket.updated",
      ticketId: "clt123",
    });

    expect(res.ok).toBe(false);
    expect(res.error).toBe("Network timeout");
  });

  it("swallows non-ok HTTP responses without throwing", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 502,
      text: () => Promise.resolve("Bad Gateway"),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { broadcastInvalidation } = await import("./broadcast");

    const res = await broadcastInvalidation(["u:key-1"], {
      type: "ticket.updated",
      ticketId: "clt123",
    });

    expect(res.ok).toBe(false);
    expect(res.error).toBe("HTTP 502");
  });

  it("notifyTicketUpdated routes to both author channel and admin channel", async () => {
    findUnique.mockResolvedValueOnce({ realtimeKey: "author-uuid-123" });

    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const { notifyTicketUpdated } = await import("./broadcast");

    await notifyTicketUpdated("clt789", "AUTH001", "ticket.reply");

    expect(findUnique).toHaveBeenCalledWith({
      where: { authorId: "AUTH001" },
      select: { realtimeKey: true },
    });

    expect(fetchMock).toHaveBeenCalled();
    const callArgs = fetchMock.mock.calls[0];
    const sentBody = JSON.parse(callArgs[1].body);

    expect(sentBody.messages).toHaveLength(2);
    expect(sentBody.messages.map((m: { topic: string }) => m.topic)).toEqual([
      "u:author-uuid-123",
      "a:test-admin-secret",
    ]);
  });

  it("notifyAdminOnly routes exclusively to admin channel", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const { notifyAdminOnly } = await import("./broadcast");

    await notifyAdminOnly("clt789", "ticket.note");

    expect(findUnique).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalled();

    const callArgs = fetchMock.mock.calls[0];
    const sentBody = JSON.parse(callArgs[1].body);

    expect(sentBody.messages).toHaveLength(1);
    expect(sentBody.messages[0].topic).toBe("a:test-admin-secret");
    expect(sentBody.messages[0].payload.type).toBe("ticket.note");
  });
});
