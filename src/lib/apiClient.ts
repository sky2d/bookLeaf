// Tiny typed fetch wrapper for the app's own REST API. Errors arrive as
// `{ error: { code, message, details } }` and are rethrown as ApiError.

export type FieldIssue = { path: string; message: string };

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }

  /** Field-level validation messages keyed by field path, for inline form errors. */
  fieldErrors(): Record<string, string> {
    if (!Array.isArray(this.details)) return {};
    return Object.fromEntries((this.details as FieldIssue[]).map((i) => [i.path, i.message]));
  }
}

export async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, headers, ...rest } = init ?? {};
  const res = await fetch(path, {
    ...rest,
    headers: { ...(json !== undefined && { "Content-Type": "application/json" }), ...headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  if (res.status === 401 && typeof window !== "undefined") {
    const login = new URL("/login", window.location.origin);
    login.searchParams.set("next", window.location.pathname);
    window.location.assign(login.href);
  }

  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const err = body?.error;
    throw new ApiError(res.status, err?.code ?? "HTTP_ERROR", err?.message ?? `Request failed (${res.status}).`, err?.details);
  }
  return body as T;
}
