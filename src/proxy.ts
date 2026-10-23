import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { homePathFor } from "@/shared/routes";

/**
 * Optimistic page-level routing only (redirects for signed-out users and the wrong portal).
 * Real authorization happens in `withAuth` on every API route and in the portal layouts.
 */
export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const user = req.auth?.user;

  if (!user) {
    if (pathname === "/login") return NextResponse.next();
    const login = new URL("/login", req.nextUrl);
    login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }

  const home = homePathFor(user.role);
  const inWrongPortal =
    (pathname.startsWith("/admin") && user.role !== "ADMIN") ||
    (pathname.startsWith("/author") && user.role !== "AUTHOR");

  if (pathname === "/login" || inWrongPortal) return NextResponse.redirect(new URL(home, req.nextUrl));
  return NextResponse.next();
});

export const config = {
  matcher: ["/login", "/author/:path*", "/admin/:path*"],
};
