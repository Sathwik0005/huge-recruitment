import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";

const PROTECTED_PATHS = ["/"];

function isProtectedPath(pathname: string) {
  return PROTECTED_PATHS.includes(pathname);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (isProtectedPath(pathname) && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
