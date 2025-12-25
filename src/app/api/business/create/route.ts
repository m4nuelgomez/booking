import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const COOKIE_GATE = "booking_gate";
const COOKIE_BID = "booking_bid";

function safeNext(next: unknown) {
  const n = typeof next === "string" ? next.trim() : "";
  // solo rutas internas
  if (n && n.startsWith("/")) return n;
  return null;
}

export async function POST(req: NextRequest) {
  const gate = req.cookies.get(COOKIE_GATE)?.value;
  if (gate !== "1") {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  const next = safeNext(body?.next);

  if (!name) {
    return NextResponse.json(
      { ok: false, error: "Business name is required" },
      { status: 400 }
    );
  }

  const business = await prisma.business.create({
    data: { name },
    select: { id: true },
  });

  const redirectTo = next ?? "/app/inbox";
  const res = NextResponse.json({
    ok: true,
    businessId: business.id,
    redirectTo,
  });

  res.cookies.set({
    name: COOKIE_BID,
    value: business.id,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 días
  });

  return res;
}
