import "server-only";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import type { Role } from "@/generated/prisma/enums";
import type { SessionUser } from "@/server/auth/types";
import { AppError } from "./AppError";
import { apiHandler } from "./apiHandler";

export type AuthedContext<P> = { user: SessionUser; params: P };

type RouteContext<P> = { params: Promise<P> };

/**
 * The single authentication/authorization choke point for API routes.
 *  - no session      → 401 UNAUTHORIZED
 *  - role not listed → 403 FORBIDDEN
 * Errors thrown inside the handler are mapped by apiHandler.
 */
export function withAuth<P = Record<string, never>>(
  handler: (req: NextRequest, ctx: AuthedContext<P>) => Promise<Response>,
  options: { roles?: Role[] } = {},
) {
  return apiHandler(async (req: NextRequest, routeCtx?: RouteContext<P>) => {
    const session = await auth();
    if (!session?.user?.id) throw AppError.unauthorized();

    const user = session.user as SessionUser;
    if (options.roles && !options.roles.includes(user.role)) throw AppError.forbidden();

    const params = routeCtx?.params ? await routeCtx.params : ({} as P);
    return handler(req, { user, params });
  });
}

/** Narrow a session to an author and return their authorId (ownership scope for every author query). */
export function requireAuthorId(user: SessionUser): string {
  if (user.role !== "AUTHOR" || !user.authorId) throw AppError.forbidden("This action is only available to authors.");
  return user.authorId;
}
