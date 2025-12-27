import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const COOKIE_ADMIN = "booking_admin";

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

  const result = await prisma.business.updateMany({
    where: { id: businessId, deletedAt: { not: null } },
    data: { deletedAt: null },
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

  return NextResponse.json({ ok: true });
}
