import { NextResponse } from "next/server";

export default function proxy(request) {
  const { pathname } = request.nextUrl;
  const adminSession = request.cookies.get("admin_session")?.value;
  const isAuthenticated = adminSession === "authenticated";

  // 1. Redirect legacy /admin/login immediately to canonical /auth/login
  if (pathname.startsWith("/admin/login")) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // 2. Protect all /admin routes
  if (pathname.startsWith("/admin")) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 3. If user is already authenticated and visits /auth or /auth/login, redirect to /admin/sessions
  if (pathname === "/auth" || pathname === "/auth/login") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/admin/sessions", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/auth", "/auth/login"],
};
