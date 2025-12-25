import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusinessIdFromReq } from "@/lib/auth-api";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params;

  const auth = requireBusinessIdFromReq(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status }
    );
  }
  const businessId = auth.businessId;

  const body = await req.json().catch(() => ({}));
  const clientId = body?.clientId ? String(body.clientId) : null; // null = unlink

  // validar que la conversación sea del business
  const convo = await prisma.conversation.findFirst({
    where: { id: conversationId, businessId },
    select: { id: true },
  });
  if (!convo) {
    return NextResponse.json(
      { ok: false, error: "Conversation not found" },
      { status: 404 }
    );
  }

  // si clientId viene, validar que ese cliente sea del mismo business
  if (clientId) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, businessId },
      select: { id: true },
    });
    if (!client) {
      return NextResponse.json(
        { ok: false, error: "Client not found" },
        { status: 404 }
      );
    }
  }

  const updated = await prisma.conversation.update({
    where: { id: conversationId },
    data: { clientId: clientId || null },
    select: { id: true, clientId: true },
  });

  return NextResponse.json({ ok: true, conversation: updated });
}
