// src/app/api/appointments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { fromZonedTime } from "date-fns-tz";
import { addMinutes } from "date-fns";
import { requireBusinessIdFromReq } from "@/lib/auth-api";

export const runtime = "nodejs";

const TZ = "America/Mexico_City";

function dayRangeUtc(dateStr?: string | null) {
  const d = dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : null;
  const localDay = d ?? new Date().toISOString().slice(0, 10);

  const startLocal = new Date(`${localDay}T00:00:00`);
  const endLocal = new Date(`${localDay}T00:00:00`);
  endLocal.setDate(endLocal.getDate() + 1);

  const start = fromZonedTime(startLocal, TZ);
  const end = fromZonedTime(endLocal, TZ);

  return { start, end };
}

function localDateTimeToUtc(dateStr: string, timeStr: string) {
  const local = new Date(`${dateStr}T${timeStr}:00`);
  return fromZonedTime(local, TZ);
}

export async function GET(req: NextRequest) {
  try {
    const auth = requireBusinessIdFromReq(req);
    if (!auth.ok) {
      return NextResponse.json(
        { ok: false, error: auth.error },
        { status: auth.status }
      );
    }
    const businessId = auth.businessId;

    const url = new URL(req.url);
    const dateStr = url.searchParams.get("date");
    const { start, end } = dayRangeUtc(dateStr);

    const items = await prisma.appointment.findMany({
      where: { businessId, startsAt: { gte: start, lt: end } },
      orderBy: { startsAt: "asc" },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        service: true,
        notes: true,
        status: true,
        client: { select: { id: true, name: true, phone: true } },
        conversationId: true,
      },
    });

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireBusinessIdFromReq(req);
    if (!auth.ok) {
      return NextResponse.json(
        { ok: false, error: auth.error },
        { status: auth.status }
      );
    }
    const businessId = auth.businessId;

    const body = await req.json().catch(() => ({}));

    const phoneRaw = String(body.phone ?? "").trim();
    const phone = normalizePhone(phoneRaw); // <- YA QUEDA 521...
    const name = body.name ? String(body.name).trim() : null;

    const dateStr = String(body.date ?? "").trim();
    const timeStr = String(body.time ?? "").trim();
    const durationMin = Number(body.durationMin ?? 60);

    const service = body.service ? String(body.service).trim() : null;
    const notes = body.notes ? String(body.notes).trim() : null;

    if (!phone) {
      return NextResponse.json(
        { ok: false, error: "Phone is required" },
        { status: 400 }
      );
    }
    if (!dateStr || !timeStr) {
      return NextResponse.json(
        { ok: false, error: "Date and time are required" },
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

    const client = await prisma.client.upsert({
      where: { businessId_phone: { businessId, phone } },
      create: { businessId, phone, name: name ?? undefined },
      update: { name: name ?? undefined },
      select: { id: true, phone: true, name: true },
    });

    const convo = await prisma.conversation.findUnique({
      where: {
        businessId_contactPhone: {
          businessId,
          contactPhone: phone, // <- MISMO NORMALIZADO
        },
      },
      select: { id: true, clientId: true },
    });

    if (convo && !convo.clientId) {
      await prisma.conversation.update({
        where: { id: convo.id },
        data: { clientId: client.id },
      });
    }

    const appt = await prisma.appointment.create({
      data: {
        businessId,
        clientId: client.id,
        conversationId: convo?.id ?? null,
        startsAt,
        endsAt,
        service,
        notes,
        status: "SCHEDULED",
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: appt.id });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
