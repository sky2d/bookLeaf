import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("getSupabaseBrowserClient", () => {
  const originalEnv = { ...process.env };
  const originalWindow = globalThis.window;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    globalThis.window = originalWindow;
  });

  it("returns null in server-side environment when window is undefined", async () => {
    // @ts-expect-error simulating SSR
    delete globalThis.window;

    const { getSupabaseBrowserClient: getClient } = await import("./supabaseBrowser");
    const client = getClient();
    expect(client).toBeNull();
  });

  it("returns null when env vars are missing in browser", async () => {
    globalThis.window = {} as unknown as Window & typeof globalThis;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const { getSupabaseBrowserClient: getClient } = await import("./supabaseBrowser");
    const client = getClient();
    expect(client).toBeNull();
  });

  it("returns singleton instance when env vars are present", async () => {
    globalThis.window = {} as unknown as Window & typeof globalThis;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-123";

    const { getSupabaseBrowserClient: getClient } = await import("./supabaseBrowser");
    const client1 = getClient();
    const client2 = getClient();

    expect(client1).not.toBeNull();
    expect(client1).toBe(client2);
  });
});
