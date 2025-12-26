import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusinessIdFromReq } from "@/lib/auth-api";
import { normalizePhone } from "@/lib/phone";

type Body = {
  conversationId?: string | null;

  phone?: string | null;
  name?: string | null;

  startsAt: string;
  endsAt?: string | null;
  durationMin?: number | null;
  service?: string | null;
  notes?: string | null;
};

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

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
  const auth = requireBusinessIdFromReq(req);
  if (!auth.ok) return bad(auth.error, auth.status);
  const businessId = auth.businessId;

  const { searchParams } = new URL(req.url);
  const dateStr = String(searchParams.get("date") ?? "").trim();
  const includeCanceled = searchParams.get("includeCanceled") === "1";

  if (!dateStr) return bad("date is required (YYYY-MM-DD)");

  const parsed = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(parsed.getTime())) return bad("date must be YYYY-MM-DD");

  const from = startOfDay(parsed);
  const to = endOfDay(parsed);

  const appts = await prisma.appointment.findMany({
    where: {
      businessId,
      startsAt: { gte: from, lte: to },
      ...(includeCanceled ? {} : { status: { not: "CANCELED" } }),
    },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      service: true,
      notes: true,
      status: true,
      clientId: true,
      conversationId: true,
      client: { select: { id: true, name: true, phone: true } },
    },
  });

  const items = appts.map((a) => ({
    id: a.id,
    startsAt: a.startsAt.toISOString(),
    endsAt: a.endsAt ? a.endsAt.toISOString() : null,
    service: a.service,
    notes: a.notes,
    status: a.status,
    clientId: a.clientId,
    conversationId: a.conversationId,
    client: a.client ? { ...a.client, phone: a.client.phone } : null,
  }));

  return NextResponse.json({ ok: true, items });
}

export async function POST(req: NextRequest) {
  const auth = requireBusinessIdFromReq(req);
  if (!auth.ok) return bad(auth.error, auth.status);
  const businessId = auth.businessId;

  const body = (await req.json().catch(() => ({}))) as Body;

  const conversationId = body?.conversationId
    ? String(body.conversationId)
    : null;

  const startsAt = body?.startsAt ? new Date(body.startsAt) : null;
  if (!startsAt || Number.isNaN(startsAt.getTime())) {
    return bad("startsAt must be a valid ISO date");
  }

  let endsAt: Date | null = null;
  if (body?.endsAt) {
    endsAt = new Date(body.endsAt);
    if (Number.isNaN(endsAt.getTime()))
      return bad("endsAt must be a valid ISO date");
  } else if (body?.durationMin) {
    const mins = Math.max(5, Number(body.durationMin));
    endsAt = new Date(startsAt.getTime() + mins * 60_000);
  }

  if (endsAt && endsAt <= startsAt) return bad("endsAt must be after startsAt");

  const name = body?.name?.trim() ? body.name.trim() : null;

  let phone = normalizePhone(String(body?.phone ?? ""));

  let convoClientId: string | null = null;

  if (!phone) {
    if (!conversationId) return bad("phone is required");

    const convo = await prisma.conversation.findFirst({
      where: { id: conversationId, businessId },
      select: { contactKey: true, clientId: true },
    });

    if (!convo) return bad("Conversation not found", 404);

    phone = normalizePhone(convo.contactKey);
    if (!phone) return bad("Conversation has invalid contactKey phone");

    convoClientId = convo.clientId ?? null;
  }

  const result = await prisma.$transaction(async (tx) => {
    const client = await tx.client.upsert({
      where: { businessId_phone: { businessId, phone } },
      create: { businessId, phone, name },
      update: { name: name ?? undefined },
      select: { id: true },
    });

    if (conversationId && !convoClientId) {
      await tx.conversation.updateMany({
        where: { id: conversationId, businessId, clientId: null },
        data: { clientId: client.id },
      });
    }

    const appt = await tx.appointment.create({
      data: {
        businessId,
        clientId: client.id,
        conversationId: body.conversationId ?? null,
        startsAt,
        endsAt,
        service: body?.service?.trim() ? body.service.trim() : null,
        notes: body?.notes?.trim() ? body.notes.trim() : null,
        status: "SCHEDULED",
      },
      select: { id: true },
    });

    return { clientId: client.id, appointmentId: appt.id };
  });

  return NextResponse.json({ ok: true, ...result });
}
