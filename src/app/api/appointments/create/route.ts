import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Body = {
  conversationId: string;
  startsAt: string;
  endsAt?: string | null;
  service?: string | null;
  notes?: string | null;
};

function badRequest(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return badRequest("Invalid JSON body");
  }

  const conversationId = body?.conversationId?.trim();
  if (!conversationId) return badRequest("conversationId is required");

  const startsAt = body?.startsAt ? new Date(body.startsAt) : null;
  if (!startsAt || Number.isNaN(startsAt.getTime()))
    return badRequest("startsAt must be a valid ISO date");

  const endsAt = body?.endsAt ? new Date(body.endsAt) : null;
  if (endsAt && Number.isNaN(endsAt.getTime()))
    return badRequest("endsAt must be a valid ISO date");

  if (endsAt && endsAt <= startsAt)
    return badRequest("endsAt must be after startsAt");

  // Load convo to anchor business + client + phone
  const convo = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, businessId: true, clientId: true, contactPhone: true },
  });
  if (!convo) return badRequest("Conversation not found", 404);

  const appt = await prisma.appointment.create({
    data: {
      businessId: convo.businessId,
      conversationId: convo.id,
      clientId: convo.clientId ?? null,
      startsAt,
      endsAt: endsAt ?? null,
      service: body?.service?.trim() ? body.service.trim() : null,
      notes: body?.notes?.trim() ? body.notes.trim() : null,
      status: "SCHEDULED",
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: appt.id });
}
