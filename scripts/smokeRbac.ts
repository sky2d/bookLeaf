// RBAC smoke test against a running app: logs in over HTTP the way a browser does,
// then checks every persona only reaches what it's allowed to.
// Run: `npm run dev` in one terminal, then `npm run smoke:rbac` (BASE_URL overrides the target).
//
// Each feature task adds its rows to CASES below.

const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

const PERSONAS = {
  anonymous: null,
  priya: { email: "priya.sharma@email.com", password: "Author@123" }, // AUTH001
  sneha: { email: "sneha.kulkarni@email.com", password: "Author@123" }, // AUTH007
  admin: { email: "admin@bookleaf.com", password: "Admin@123" },
  wrongPassword: { email: "priya.sharma@email.com", password: "not-the-password" },
} as const;

type Persona = keyof typeof PERSONAS;

type Case = {
  as: Persona;
  method?: "GET" | "POST" | "PATCH";
  path: string;
  body?: unknown;
  status: number;
  /** Extra assertion on the JSON body; return an error message, or null when it passes. */
  expect?: (body: unknown) => string | null;
};

/** Passes when the response lists exactly these book ids (any order). */
function exactlyBooks(...ids: string[]) {
  return (body: unknown) => {
    const got = ((body as { books?: { id: string }[] }).books ?? []).map((b) => b.id).sort();
    const want = [...ids].sort();
    return JSON.stringify(got) === JSON.stringify(want) ? null : `expected books ${want.join(",")}, got ${got.join(",") || "none"}`;
  };
}

const errorCode = (code: string) => (body: unknown) => {
  const got = (body as { error?: { code?: string } }).error?.code;
  return got === code ? null : `expected error code ${code}, got ${got ?? "none"}`;
};

const CASES: Case[] = [
  // Not signed in → 401 JSON, never an HTML redirect.
  { as: "anonymous", path: "/api/me", status: 401, expect: errorCode("UNAUTHORIZED") },
  { as: "anonymous", path: "/api/me/books", status: 401, expect: errorCode("UNAUTHORIZED") },
  // A failed login must not produce a session.
  { as: "wrongPassword", path: "/api/me", status: 401 },
  // Authors see only their own books.
  { as: "priya", path: "/api/me", status: 200 },
  { as: "priya", path: "/api/me/books", status: 200, expect: exactlyBooks("BK001", "BK002") },
  { as: "sneha", path: "/api/me/books", status: 200, expect: exactlyBooks("BK011", "BK012", "BK013") },
  // Admins can't use author-only routes.
  { as: "admin", path: "/api/me", status: 200 },
  { as: "admin", path: "/api/me/books", status: 403, expect: errorCode("FORBIDDEN") },
  // Ticket creation:
  {
    as: "anonymous",
    method: "POST",
    path: "/api/tickets",
    body: { subject: "Anonymous submission test", description: "A detailed description of the issue." },
    status: 401,
    expect: errorCode("UNAUTHORIZED"),
  },
  {
    as: "admin",
    method: "POST",
    path: "/api/tickets",
    body: { subject: "Admin submission attempt", description: "A detailed description of the issue." },
    status: 403,
    expect: errorCode("FORBIDDEN"),
  },
  {
    as: "priya",
    method: "POST",
    path: "/api/tickets",
    body: {
      bookId: "BK011",
      subject: "Query on foreign book",
      description: "A detailed description about another author's book.",
    },
    status: 404,
    expect: errorCode("NOT_FOUND"),
  },
  { as: "priya", method: "POST", path: "/api/tickets", body: {}, status: 400, expect: errorCode("VALIDATION_ERROR") },
  // Ticket detail & messages:
  { as: "anonymous", path: "/api/tickets/nonexistent-id", status: 401, expect: errorCode("UNAUTHORIZED") },
  { as: "admin", path: "/api/tickets/nonexistent-id", status: 403, expect: errorCode("FORBIDDEN") },
  { as: "priya", path: "/api/tickets/nonexistent-id", status: 404, expect: errorCode("NOT_FOUND") },
  {
    as: "anonymous",
    method: "POST",
    path: "/api/tickets/nonexistent-id/messages",
    body: { body: "Hello" },
    status: 401,
    expect: errorCode("UNAUTHORIZED"),
  },
  {
    as: "admin",
    method: "POST",
    path: "/api/tickets/nonexistent-id/messages",
    body: { body: "Hello" },
    status: 403,
    expect: errorCode("FORBIDDEN"),
  },
  {
    as: "priya",
    method: "POST",
    path: "/api/tickets/nonexistent-id/messages",
    body: { body: "Hello" },
    status: 404,
    expect: errorCode("NOT_FOUND"),
  },
  // Ticket list (Task 6b):
  { as: "anonymous", path: "/api/tickets", status: 401, expect: errorCode("UNAUTHORIZED") },
  { as: "admin", path: "/api/tickets", status: 403, expect: errorCode("FORBIDDEN") },
  { as: "priya", path: "/api/tickets", status: 200 },
  { as: "sneha", path: "/api/tickets", status: 200 },
  // Admin Ticket Queue (Task 7):
  { as: "anonymous", path: "/api/admin/tickets", status: 401, expect: errorCode("UNAUTHORIZED") },
  { as: "priya", path: "/api/admin/tickets", status: 403, expect: errorCode("FORBIDDEN") },
  { as: "admin", path: "/api/admin/tickets", status: 200 },
  // Admin Ticket Detail & Actions (Task 8):
  { as: "anonymous", path: "/api/admin/tickets/nonexistent-id", status: 401, expect: errorCode("UNAUTHORIZED") },
  { as: "priya", path: "/api/admin/tickets/nonexistent-id", status: 403, expect: errorCode("FORBIDDEN") },
  {
    as: "priya",
    method: "PATCH",
    path: "/api/admin/tickets/nonexistent-id",
    body: { status: "IN_PROGRESS" },
    status: 403,
    expect: errorCode("FORBIDDEN"),
  },
  {
    as: "priya",
    method: "POST",
    path: "/api/admin/tickets/nonexistent-id/messages",
    body: { body: "Admin reply attempt by author" },
    status: 403,
    expect: errorCode("FORBIDDEN"),
  },
  {
    as: "priya",
    method: "POST",
    path: "/api/admin/tickets/nonexistent-id/notes",
    body: { body: "Internal note attempt by author" },
    status: 403,
    expect: errorCode("FORBIDDEN"),
  },
  { as: "admin", path: "/api/admin/tickets/nonexistent-id", status: 404, expect: errorCode("NOT_FOUND") },
  // Admin Ticket Re-classify (Task 11):
  {
    as: "anonymous",
    method: "POST",
    path: "/api/admin/tickets/nonexistent-id/classify",
    status: 401,
    expect: errorCode("UNAUTHORIZED"),
  },
  {
    as: "priya",
    method: "POST",
    path: "/api/admin/tickets/nonexistent-id/classify",
    status: 403,
    expect: errorCode("FORBIDDEN"),
  },
  {
    as: "admin",
    method: "POST",
    path: "/api/admin/tickets/nonexistent-id/classify",
    status: 404,
    expect: errorCode("NOT_FOUND"),
  },
  // Admin Ticket AI Draft (Task 12):
  {
    as: "anonymous",
    path: "/api/admin/tickets/nonexistent-id/draft",
    status: 401,
    expect: errorCode("UNAUTHORIZED"),
  },
  {
    as: "priya",
    path: "/api/admin/tickets/nonexistent-id/draft",
    status: 403,
    expect: errorCode("FORBIDDEN"),
  },
  {
    as: "admin",
    path: "/api/admin/tickets/nonexistent-id/draft",
    status: 404,
    expect: errorCode("NOT_FOUND"),
  },
];

/** Minimal cookie jar: keeps name=value pairs from Set-Cookie headers. */
class CookieJar {
  private cookies = new Map<string, string>();
  store(res: Response) {
    for (const header of res.headers.getSetCookie()) {
      const [pair] = header.split(";");
      const eq = pair.indexOf("=");
      this.cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1));
    }
  }
  header() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

/**
 * Auth.js credentials sign-in: fetch a CSRF token, then post the form. Returns the session cookies.
 * Retries network errors and 5xx (e.g. a cold database); whether a session was granted is left to the CASES.
 */
async function login(creds: { email: string; password: string }): Promise<CookieJar> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const jar = new CookieJar();
      const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
      jar.store(csrfRes);
      const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

      const res = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
        method: "POST",
        redirect: "manual",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: jar.header() },
        body: new URLSearchParams({ ...creds, csrfToken, callbackUrl: `${BASE_URL}/` }),
      });
      if (res.status < 500) {
        jar.store(res);
        return jar;
      }
      lastError = `HTTP ${res.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : err;
    }
    if (attempt < 3) await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Sign-in for ${creds.email} failed after 3 attempts: ${lastError}`);
}

async function main() {
  try {
    await fetch(`${BASE_URL}/api/health`);
  } catch {
    throw new Error(`App not reachable at ${BASE_URL}. Start it with \`npm run dev\` or set BASE_URL.`);
  }
  console.log(`RBAC smoke test against ${BASE_URL}\n`);

  const sessions = new Map<Persona, CookieJar | null>();
  for (const [name, creds] of Object.entries(PERSONAS) as [Persona, (typeof PERSONAS)[Persona]][]) {
    sessions.set(name, creds ? await login(creds) : null);
  }

  let failures = 0;
  for (const c of CASES) {
    const method = c.method ?? "GET";
    const jar = sessions.get(c.as);
    const res = await fetch(`${BASE_URL}${c.path}`, {
      method,
      redirect: "manual",
      headers: {
        ...(jar && { Cookie: jar.header() }),
        ...(c.body !== undefined && { "Content-Type": "application/json" }),
      },
      body: c.body !== undefined ? JSON.stringify(c.body) : undefined,
    });
    const body = await res.json().catch(() => null);

    const problem =
      res.status !== c.status ? `expected HTTP ${c.status}, got ${res.status}` : c.expect ? c.expect(body) : null;
    console.log(`${problem ? "✘" : "✔"} ${c.as.padEnd(13)} ${method.padEnd(5)} ${c.path} → ${res.status}${problem ? ` — ${problem}` : ""}`);
    if (problem) failures++;
  }

  console.log(`\n${CASES.length - failures}/${CASES.length} passed`);
  process.exitCode = failures ? 1 : 0;
}

main().catch((err) => {
  console.error(`✘ ${err instanceof Error ? err.message : err}`);
  process.exitCode = 1;
});
