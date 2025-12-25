import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusinessIdFromReq } from "@/lib/auth-api";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const auth = requireBusinessIdFromReq(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status }
    );
  }
  const businessId = auth.businessId;

  const body = await req.json().catch(() => ({}));
  const lastMessageId = body?.lastMessageId ? String(body.lastMessageId) : "";

  if (!lastMessageId) {
    return NextResponse.json(
      { ok: false, error: "lastMessageId required" },
      { status: 400 }
    );
  }

  const msg = await prisma.message.findFirst({
    where: { id: lastMessageId, conversationId: id, businessId },
    select: { id: true },
  });

  if (!msg) {
    return NextResponse.json(
      { ok: false, error: "message not found" },
      { status: 404 }
    );
  }

  await prisma.conversation.updateMany({
    where: { id, businessId },
    data: { lastReadMessageId: lastMessageId, unreadCount: 0 },
  });

  return NextResponse.json({ ok: true });
}
