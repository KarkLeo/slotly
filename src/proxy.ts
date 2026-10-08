import type { NextRequest } from "next/server";
import { requiresSignIn } from "@/auth/next-path";
import { redirectKeepingCookies, updateSession } from "@/db/session";

export async function proxy(request: NextRequest) {
  const { response, isSignedIn } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (!isSignedIn && requiresSignIn(pathname)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return redirectKeepingCookies(url, response);
  }

  if (isSignedIn && pathname === "/login") {
    return redirectKeepingCookies(new URL("/app", request.url), response);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/health|api/mcp|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
