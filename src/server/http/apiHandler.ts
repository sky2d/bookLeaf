import { ZodError, type ZodType } from "zod";
import { AppError } from "./AppError";

export type ApiErrorBody = {
  error: { code: string; message: string; details?: unknown };
};

/** Prisma known-request errors are matched by shape so this module stays decoupled from the generated client. */
function prismaErrorCode(err: unknown): string | undefined {
  if (err && typeof err === "object" && "code" in err && typeof err.code === "string" && /^P\d{4}$/.test(err.code)) {
    return err.code;
  }
  return undefined;
}

export function errorResponse(status: number, code: string, message: string, details?: unknown) {
  const body: ApiErrorBody = { error: { code, message, ...(details !== undefined && { details }) } };
  return Response.json(body, { status });
}

/** Maps any thrown value to a consistent JSON error response. */
export function toErrorResponse(err: unknown): Response {
  if (err instanceof AppError) {
    return errorResponse(err.status, err.code, err.message, err.details);
  }
  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    return errorResponse(400, "VALIDATION_ERROR", "Some fields are invalid.", details);
  }
  switch (prismaErrorCode(err)) {
    case "P2025":
      return errorResponse(404, "NOT_FOUND", "Resource not found.");
    case "P2002":
      return errorResponse(409, "CONFLICT", "A record with these details already exists.");
  }
  console.error("[api] unhandled error", err);
  return errorResponse(500, "INTERNAL_ERROR", "Something went wrong on our side. Please try again.");
}

/** Wraps a route handler so every failure becomes a structured JSON error instead of a raw 500. */
export function apiHandler<Args extends unknown[]>(handler: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

/** Parses and validates a JSON request body. Malformed JSON → 400 INVALID_JSON; schema failure → 400 VALIDATION_ERROR. */
export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new AppError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
  return schema.parse(raw);
}

/** Validates URL search params against a schema (repeated keys are ignored; last value wins). */
export function parseQuery<T>(url: URL, schema: ZodType<T>): T {
  return schema.parse(Object.fromEntries(url.searchParams.entries()));
}
