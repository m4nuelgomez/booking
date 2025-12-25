import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "booking_gate";
const BIZ_COOKIE = "booking_bid";

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ✅ Nunca interceptar API (excepto webhooks si quieres, pero igual no hace falta)
  if (pathname.startsWith("/api")) return NextResponse.next();

  if (
    pathname === "/login" ||
    pathname === "/onboarding" ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const isProtected =
    pathname === "/inbox" ||
    pathname.startsWith("/inbox/") ||
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/agenda" ||
    pathname.startsWith("/agenda/") ||
    pathname === "/clients" ||
    pathname.startsWith("/clients/");

  if (!isProtected) return NextResponse.next();

  const gate = req.cookies.get(COOKIE_NAME)?.value;
  if (gate !== "1") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const bid = req.cookies.get(BIZ_COOKIE)?.value;
  if (!bid) {
    const url = req.nextUrl.clone();
    url.pathname = "/onboarding";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
