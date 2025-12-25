import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fromZonedTime } from "date-fns-tz";
import { addMinutes } from "date-fns";
import { requireBusinessIdFromReq } from "@/lib/auth-api";

export const runtime = "nodejs";

const TZ = "America/Mexico_City";

function localDateTimeToUtc(dateStr: string, timeStr: string) {
  const local = new Date(`${dateStr}T${timeStr}:00`);
  return fromZonedTime(local, TZ);
}

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
    const body = await req.json().catch(() => ({}));
    const dateStr = String(body?.date ?? "").trim(); // YYYY-MM-DD
    const timeStr = String(body?.time ?? "").trim(); // HH:MM
    const durationMin = Number(body?.durationMin ?? 60);

    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return NextResponse.json(
        { ok: false, error: "Invalid date" },
        { status: 400 }
      );
    }
    if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) {
      return NextResponse.json(
        { ok: false, error: "Invalid time" },
        { status: 400 }
      );
    }
    if (
      !Number.isFinite(durationMin) ||
      durationMin <= 0 ||
      durationMin > 24 * 60
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid duration" },
        { status: 400 }
      );
    }

    const startsAt = localDateTimeToUtc(dateStr, timeStr);
    const endsAt = addMinutes(startsAt, durationMin);

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
    if (appt.status === "CANCELED") {
      return NextResponse.json(
        { ok: false, error: "Appointment is canceled" },
        { status: 400 }
      );
    }

    await prisma.appointment.update({
      where: { id },
      data: { startsAt, endsAt, status: "SCHEDULED" },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
