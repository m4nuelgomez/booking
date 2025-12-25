// src/app/api/appointments/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusinessIdFromReq } from "@/lib/auth-api";
import { fromZonedTime } from "date-fns-tz";
import { addMinutes } from "date-fns";

export const runtime = "nodejs";

const TZ = "America/Mexico_City";

function localDateTimeToUtc(dateStr: string, timeStr: string) {
  const local = new Date(`${dateStr}T${timeStr}:00`);
  return fromZonedTime(local, TZ);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const auth = requireBusinessIdFromReq(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status }
    );
  }
  const businessId = auth.businessId;

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "").trim();

  // ✅ Cancelar
  if (action === "cancel") {
    const updated = await prisma.appointment.updateMany({
      where: { id, businessId },
      data: { status: "CANCELED" },
    });

    if (!updated.count) {
      return NextResponse.json(
        { ok: false, error: "Appointment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  }

  // ✅ Reagendar / editar
  const dateStr = String(body?.date ?? "").trim(); // YYYY-MM-DD
  const timeStr = String(body?.time ?? "").trim(); // HH:MM
  const durationMin = Number(body?.durationMin ?? NaN);

  const service =
    body?.service !== undefined ? String(body.service).trim() : undefined;
  const notes =
    body?.notes !== undefined ? String(body.notes).trim() : undefined;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !/^\d{2}:\d{2}$/.test(timeStr)) {
    return NextResponse.json(
      { ok: false, error: "date/time invalid" },
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

  const updated = await prisma.appointment.updateMany({
    where: { id, businessId },
    data: {
      startsAt,
      endsAt,
      status: "SCHEDULED", // si estaba cancelada y la reagendas, revive
      ...(service !== undefined ? { service: service || null } : {}),
      ...(notes !== undefined ? { notes: notes || null } : {}),
    },
  });

  if (!updated.count) {
    return NextResponse.json(
      { ok: false, error: "Appointment not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
