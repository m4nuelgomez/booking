import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";

export const runtime = "nodejs";

const DEFAULT_BUSINESS_ID = process.env.DEFAULT_BUSINESS_ID ?? "dev-business";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const appointmentId = String(body?.appointmentId ?? "").trim();

    if (!appointmentId) {
      return NextResponse.json(
        { ok: false, error: "appointmentId is required" },
        { status: 400 }
      );
    }

    const appt = await prisma.appointment.findFirst({
      where: { id: appointmentId, businessId: DEFAULT_BUSINESS_ID },
      select: {
        id: true,
        conversationId: true,
        client: { select: { id: true, phone: true } },
      },
    });

    if (!appt) {
      return NextResponse.json(
        { ok: false, error: "Appointment not found" },
        { status: 404 }
      );
    }

    if (appt.conversationId) {
      return NextResponse.json({
        ok: true,
        conversationId: appt.conversationId,
      });
    }

    const clientId = appt.client?.id ?? null;
    const phoneRaw = appt.client?.phone ?? "";
    const contactPhone = normalizePhone(phoneRaw);

    if (!clientId || !contactPhone) {
      return NextResponse.json(
        { ok: false, error: "Appointment has no client phone" },
        { status: 400 }
      );
    }

    const convo = await prisma.conversation.upsert({
      where: {
        businessId_contactPhone: {
          businessId: DEFAULT_BUSINESS_ID,
          contactPhone,
        },
      },
      create: {
        businessId: DEFAULT_BUSINESS_ID,
        contactPhone,
        clientId,
        lastMessageAt: new Date(),
      },
      update: {
        lastMessageAt: new Date(),
        clientId: clientId,
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
