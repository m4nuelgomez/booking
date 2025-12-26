// src/app/api/conversations/ensure/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { requireBusinessIdFromReq } from "@/lib/auth-api";

export const runtime = "nodejs";

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
    const appointmentId = String(body?.appointmentId ?? "").trim();

    if (!appointmentId) {
      return NextResponse.json(
        { ok: false, error: "appointmentId is required" },
        { status: 400 }
      );
    }

    const appt = await prisma.appointment.findFirst({
      where: { id: appointmentId, businessId },
      select: {
        id: true,
        conversationId: true,
        client: { select: { id: true, phone: true, name: true } },
      },
    });

    if (!appt) {
      return NextResponse.json(
        { ok: false, error: "Appointment not found" },
        { status: 404 }
      );
    }

    // ✅ ya estaba linkeada
    if (appt.conversationId) {
      return NextResponse.json({
        ok: true,
        conversationId: appt.conversationId,
      });
    }

    const phoneRaw = appt.client?.phone ?? "";
    const contactKey = normalizePhone(phoneRaw);

    if (!contactKey) {
      return NextResponse.json(
        { ok: false, error: "Appointment client has no valid phone" },
        { status: 400 }
      );
    }

    // Por ahora Agenda siempre abre WhatsApp. A futuro, esto saldrá del Appointment/Client.
    const channel = "whatsapp";
    const contactDisplay = appt.client?.name?.trim() || contactKey;

    const convo = await prisma.conversation.upsert({
      where: {
        businessId_channel_contactKey: { businessId, channel, contactKey },
      },
      create: {
        businessId,
        channel,
        contactKey,
        contactDisplay,
        clientId: appt.client?.id ?? null,
        lastMessageAt: new Date(),
      },
      update: {
        // si el cliente existe, garantizamos vínculo
        clientId: appt.client?.id ?? undefined,
        lastMessageAt: new Date(),
      },
      select: { id: true },
    });

    await prisma.appointment.update({
      where: { id: appt.id },
      data: { conversationId: convo.id },
    });

    return NextResponse.json({ ok: true, conversationId: convo.id });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
