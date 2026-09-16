import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// NAO importar libs de Node aqui (edge runtime).
const TOKEN_COOKIE = "__Host-fitpro_token";

export function proxy(request: NextRequest) {
  if (!request.cookies.has(TOKEN_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/profile/:path*",
    "/progress/:path*",
    "/students/:path*",
    "/workouts/:path*",
    "/diets/:path*",
    "/exercises/:path*",
    "/billing/:path*",
    "/notifications/:path*",
  ],
};