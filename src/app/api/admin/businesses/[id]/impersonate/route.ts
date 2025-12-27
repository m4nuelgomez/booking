import { NextRequest, NextResponse } from "next/server";
import { requireAdminFromReq } from "@/lib/auth-api";
import { prisma } from "@/lib/prisma";

const COOKIE_BID = "booking_bid";

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = requireAdminFromReq(req);
  if (!auth.ok) return bad(auth.error, auth.status);

  const { id } = await ctx.params;

  // validar que existe
  const b = await prisma.business.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!b) return bad("Negocio no encontrado.", 404);

  const url = new URL(req.url);
  const next = url.searchParams.get("next") || "/app/dashboard";

  // setea tenant
  const res = NextResponse.redirect(
    new URL(`/login?next=${encodeURIComponent(next)}`, url)
  );

  res.cookies.set(COOKIE_BID, b.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  return res;
}
