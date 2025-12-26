import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusinessId } from "@/lib/auth";
import { normalizePhoneLoose } from "@/lib/phone";
import { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  const businessId = await requireBusinessId();

  const body = await req.json().catch(() => ({}));
  const clientId = String(body?.clientId ?? "").trim();
  const channel = String(body?.channel ?? "whatsapp")
    .trim()
    .toLowerCase();

  if (!clientId) {
    return NextResponse.json(
      { ok: false, error: "clientId is required" },
      { status: 400 }
    );
  }

  const client = await prisma.client.findFirst({
    where: { id: clientId, businessId },
    select: { id: true, phone: true, name: true },
  });

  if (!client) {
    return NextResponse.json(
      { ok: false, error: "Client not found" },
      { status: 404 }
    );
  }

  const contactKey = normalizePhoneLoose(client.phone);
  if (!contactKey) {
    return NextResponse.json(
      { ok: false, error: "Invalid client phone (cannot derive contactKey)" },
      { status: 400 }
    );
  }

  const contactDisplay = client.name?.trim() || client.phone;

  try {
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
        contactDisplay,
        clientId: client.id,
      },
      update: {
        clientId: client.id,
        contactDisplay,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, conversationId: convo.id });
  } catch (err: unknown) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const existing = await prisma.conversation.findUnique({
        where: {
          businessId_channel_contactKey: { businessId, channel, contactKey },
        },
        select: { id: true },
      });

      if (existing) {
        return NextResponse.json({ ok: true, conversationId: existing.id });
      }
    }
    throw err;
  }
}
