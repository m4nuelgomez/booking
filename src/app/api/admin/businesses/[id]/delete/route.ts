import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const COOKIE_BID = "booking_bid";
const COOKIE_ADMIN = "booking_admin";

function expireCookie(res: NextResponse, name: string) {
  res.cookies.set(name, "", {
    httpOnly: true,
    path: "/",
    expires: new Date(0),
    maxAge: 0,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const isAdmin = req.cookies.get(COOKIE_ADMIN)?.value === "1";
  if (!isAdmin) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id: businessId } = await ctx.params;

  const body = await req.json().catch(() => ({}));
  const confirm = String(body?.confirm ?? "")
    .trim()
    .toUpperCase();
  if (confirm !== "ELIMINAR") {
    return NextResponse.json(
      { ok: false, error: 'Confirmación inválida. Escribe "ELIMINAR".' },
      { status: 400 }
    );
  }

  const result = await prisma.business.updateMany({
    where: { id: businessId, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  if (result.count === 0) {
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
  }

  const res = NextResponse.json({ ok: true });

  const currentBid = req.cookies.get(COOKIE_BID)?.value;
  if (currentBid === businessId) {
    expireCookie(res, COOKIE_BID);
  }

  return res;
}
