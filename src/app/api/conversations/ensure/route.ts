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

    // tolerancia a conversaciones viejas con +521...
    const alt521 = contactPhone.startsWith("+52")
      ? `+521${contactPhone.slice(3)}`
      : null;

    const existing = await prisma.conversation.findFirst({
      where: {
        businessId,
        OR: [{ contactPhone }, ...(alt521 ? [{ contactPhone: alt521 }] : [])],
      },
      select: { id: true },
    });

    const convoId = existing
      ? existing.id
      : (
          await prisma.conversation.create({
            data: {
              businessId,
              contactPhone,
              clientId,
              lastMessageAt: new Date(),
            },
            select: { id: true },
          })
        ).id;

    await prisma.appointment.update({
      where: { id: appt.id },
      data: { conversationId: convoId },
    });

    return NextResponse.json({ ok: true, conversationId: convoId });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
