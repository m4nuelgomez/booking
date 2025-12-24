import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const BUSINESS_ID = process.env.DEFAULT_BUSINESS_ID ?? "dev-business";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const lastMessageId = body?.lastMessageId ? String(body.lastMessageId) : "";

  if (!lastMessageId) {
    return NextResponse.json(
      { ok: false, error: "lastMessageId required" },
      { status: 400 }
    );
  }

  // valida que el mensaje existe y pertenece a esa conversación y negocio
  const msg = await prisma.message.findFirst({
    where: { id: lastMessageId, conversationId: id, businessId: BUSINESS_ID },
    select: { id: true },
  });

  if (!msg) {
    return NextResponse.json(
      { ok: false, error: "message not found" },
      { status: 404 }
    );
  }

  await prisma.conversation.update({
    where: { id },
    data: {
      lastReadMessageId: lastMessageId,
      unreadCount: 0,
    },
  });

  return NextResponse.json({ ok: true });
}
