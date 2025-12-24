import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "booking_gate";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/logout") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/webhooks/whatsapp")) {
    return NextResponse.next();
  }

  const isProtected =
    pathname === "/inbox" ||
    pathname.startsWith("/inbox/") ||
    pathname.startsWith("/api/messages/") ||
    pathname.startsWith("/api/conversations/");

  if (!isProtected) return NextResponse.next();

  const gate = req.cookies.get(COOKIE_NAME)?.value;
  if (gate !== "1") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/inbox",
    "/inbox/:path*",
    "/api/messages/:path*",
    "/api/conversations/:path*",
    "/api/webhooks/whatsapp/:path*",
  ],
};
