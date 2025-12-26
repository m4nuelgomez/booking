import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusinessIdFromReq } from "@/lib/auth-api";
import { normalizePhone } from "@/lib/phone";

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
    const clientId = String(body?.clientId ?? "").trim();

    if (!clientId) {
      return NextResponse.json(
        { ok: false, error: "clientId is required" },
        { status: 400 }
      );
    }

    const client = await prisma.client.findFirst({
      where: { id: clientId, businessId },
      select: { id: true, phone: true },
    });

    if (!client) {
      return NextResponse.json(
        { ok: false, error: "Client not found" },
        { status: 404 }
      );
    }

    const contactKey = normalizePhone(client.phone);
    if (!contactKey) {
      return NextResponse.json(
        { ok: false, error: "Client has no valid phone" },
        { status: 400 }
      );
    }

    const channel = "whatsapp";

    const convo = await prisma.conversation.upsert({
      where: {
        businessId_channel_contactKey: {
          businessId,
          channel,
          contactKey,
        },
      },
      create: {
        businessId,
        channel,
        contactKey,
        clientId: client.id,
        lastMessageAt: new Date(),
      },
      update: {
        clientId: client.id,
        lastMessageAt: new Date(),
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, conversationId: convo.id });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
