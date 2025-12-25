import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";

const DEFAULT_BUSINESS_ID = process.env.DEFAULT_BUSINESS_ID ?? "dev-business";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const dateStr = url.searchParams.get("date"); // YYYY-MM-DD
    const date = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();

    const from = startOfDay(date);
    const to = endOfDay(date);

    const items = await prisma.appointment.findMany({
      where: {
        businessId: DEFAULT_BUSINESS_ID,
        startsAt: { gte: from, lte: to },
      },
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
    const body = await req.json();

    const phoneRaw = String(body.phone ?? "").trim();
    const phone = normalizePhone(phoneRaw);
    const name = body.name ? String(body.name).trim() : null;

    const dateStr = String(body.date ?? "").trim(); // YYYY-MM-DD
    const timeStr = String(body.time ?? "").trim(); // HH:MM
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

    const startsAt = new Date(`${dateStr}T${timeStr}:00`);
    const endsAt = new Date(startsAt.getTime() + durationMin * 60 * 1000);

    const client = await prisma.client.upsert({
      where: { businessId_phone: { businessId: DEFAULT_BUSINESS_ID, phone } },
      create: {
        businessId: DEFAULT_BUSINESS_ID,
        phone,
        name: name ?? undefined,
      },
      update: { name: name ?? undefined },
      select: { id: true, phone: true, name: true },
    });

    // Link to conversation if exists
    const convo = await prisma.conversation.findUnique({
      where: {
        businessId_contactPhone: {
          businessId: DEFAULT_BUSINESS_ID,
          contactPhone: phone,
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
        businessId: DEFAULT_BUSINESS_ID,
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
