import { NextRequest, NextResponse } from "next/server";

const COOKIE_GATE = "booking_gate";
const COOKIE_BID = "booking_bid";
const COOKIE_ADMIN = "booking_admin";

function redirectTo(req: NextRequest, to: string) {
  const url = req.nextUrl.clone();
  url.pathname = to;
  return NextResponse.redirect(url);
}

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname === "/login" ||
    pathname === "/onboarding" ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  if (pathname === "/app/login") return redirectTo(req, "/login");

  if (pathname === "/inbox") return redirectTo(req, "/app/inbox");
  if (pathname === "/dashboard") return redirectTo(req, "/app/dashboard");
  if (pathname === "/agenda") return redirectTo(req, "/app/agenda");
  if (pathname === "/clients") return redirectTo(req, "/app/clients");

  if (pathname === "/admin") return redirectTo(req, "/admin/global");

  if (pathname.startsWith("/api/admin/")) {
    const isAdmin = req.cookies.get(COOKIE_ADMIN)?.value === "1";
    if (!isAdmin) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) return NextResponse.next();

  const isAdminUi = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAppUi = pathname === "/app" || pathname.startsWith("/app/");

  const isProtected = isAdminUi || isAppUi;
  if (!isProtected) return NextResponse.next();

  const gate = req.cookies.get(COOKIE_GATE)?.value;
  if (gate !== "1") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAdminUi) {
    const isAdmin = req.cookies.get(COOKIE_ADMIN)?.value === "1";
    if (!isAdmin) {
      return redirectTo(req, "/app/dashboard");
    }
  }

  if (isAppUi) {
    const bid = req.cookies.get(COOKIE_BID)?.value;
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
