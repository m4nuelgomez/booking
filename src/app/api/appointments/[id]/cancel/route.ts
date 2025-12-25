import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusinessIdFromReq } from "@/lib/auth-api";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = requireBusinessIdFromReq(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status }
    );
  }
  const businessId = auth.businessId;

  const { id } = await ctx.params;

  try {
    const appt = await prisma.appointment.findFirst({
      where: { id, businessId },
      select: { id: true, status: true },
    });

    if (!appt) {
      return NextResponse.json(
        { ok: false, error: "Appointment not found" },
        { status: 404 }
      );
    }

    if (appt.status === "CANCELED") return NextResponse.json({ ok: true });

    await prisma.appointment.update({
      where: { id },
      data: { status: "CANCELED" },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
