import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const COOKIE_BID = "booking_bid";

function isAdmin(req: NextRequest) {
  return req.cookies.get("booking_admin")?.value === "1";
}

function safeRedirect(next: unknown) {
  if (typeof next === "string" && next.startsWith("/")) return next;
  return "/app/dashboard";
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const businessId =
    typeof body?.businessId === "string" ? body.businessId : "";
  const redirectTo = safeRedirect(body?.next);

  if (!businessId) {
    return NextResponse.json(
      { ok: false, error: "Missing businessId" },
      { status: 400 }
    );
  }

  const exists = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true },
  });

  if (!exists) {
    return NextResponse.json(
      { ok: false, error: "Business not found" },
      { status: 404 }
    );
  }

  const res = NextResponse.json({ ok: true, redirectTo });

  res.cookies.set(COOKIE_BID, businessId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return res;
}
