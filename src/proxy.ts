import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "booking_gate";
const BIZ_COOKIE = "booking_bid";

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api") || pathname.startsWith("/auth/api")) {
    return NextResponse.next();
  }

  if (
    pathname === "/login" ||
    pathname === "/onboarding" ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const isProtected =
    pathname === "/app" ||
    pathname.startsWith("/app/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/");

  if (!isProtected) return NextResponse.next();

  const gate = req.cookies.get(COOKIE_NAME)?.value;
  if (gate !== "1") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const needsBusiness = pathname === "/app" || pathname.startsWith("/app/");

  if (needsBusiness) {
    const bid = req.cookies.get(BIZ_COOKIE)?.value;
    if (!bid) {
      const url = req.nextUrl.clone();
      url.pathname = "/onboarding";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
