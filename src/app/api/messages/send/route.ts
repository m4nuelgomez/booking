// src/app/api/messages/send/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const businessId = process.env.DEFAULT_BUSINESS_ID;
  if (!businessId) {
    return NextResponse.json(
      { ok: false, error: "Missing env DEFAULT_BUSINESS_ID" },
      { status: 500 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const conversationId = String(body?.conversationId ?? "");
  const toPhone = String(body?.toPhone ?? "");
  const text = String(body?.text ?? "").trim();

  if (!conversationId || !toPhone || !text) {
    return NextResponse.json(
      { ok: false, error: "conversationId, toPhone and text are required" },
      { status: 400 }
    );
  }

  try {
    // Validar que la conversación exista y pertenezca al business
    const convo = await prisma.conversation.findFirst({
      where: { id: conversationId, businessId },
      select: { id: true, contactPhone: true },
    });

    if (!convo) {
      return NextResponse.json(
        { ok: false, error: "Conversation not found for this business" },
        { status: 404 }
      );
    }

    // Transacción: crear Outbox + crear Message OUTBOUND + actualizar lastMessageAt
    const result = await prisma.$transaction(async (tx) => {
      const outbox = await tx.outboxMessage.create({
        data: {
          businessId,
          conversationId,
          provider: "whatsapp",
          toPhone,
          text,
          status: "PENDING",
          attemptCount: 0,
          nextAttemptAt: new Date(),
        },
        select: { id: true, status: true, createdAt: true },
      });

      const msg = await tx.message.create({
        data: {
          businessId,
          conversationId,
          direction: "OUTBOUND",
          provider: "whatsapp",
          providerMessageId: null, // cuando mandemos real, aquí irá el id real
          fromPhone: "business",   // MVP: placeholder
          toPhone,
          text,
          payload: { outboxId: outbox.id }, // link útil para futuro worker
        },
        select: { id: true, createdAt: true },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      });

      return { outbox, msg };
    });

    return NextResponse.json({
      ok: true,
      outboxId: result.outbox.id,
      messageId: result.msg.id,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}