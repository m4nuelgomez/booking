import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { requireBusinessIdFromReq } from "@/lib/auth-api";

export const runtime = "nodejs";

function toWhatsAppRecipient(canonicPhone: string) {
  let digits = canonicPhone.replace(/\D/g, "");

  if (digits.startsWith("521") && digits.length === 13) {
    digits = "52" + digits.slice(3);
  }

  if (!digits) throw new Error("Invalid recipient phone");
  return digits;
}

export async function POST(req: NextRequest) {
  const auth = requireBusinessIdFromReq(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status }
    );
  }
  const businessId = auth.businessId;

  let body: any;
  try {
    const raw = await req.arrayBuffer();
    const jsonText = new TextDecoder("utf-8").decode(raw);
    body = JSON.parse(jsonText);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const conversationId = String(body?.conversationId ?? "");
  const text = String(body?.text ?? "").trim();

  if (!conversationId || !text) {
    return NextResponse.json(
      { ok: false, error: "conversationId and text are required" },
      { status: 400 }
    );
  }

  try {
    // ✅ Validar conversación por tenant
    const convo = await prisma.conversation.findFirst({
      where: { id: conversationId, businessId },
      select: { id: true, channel: true, contactKey: true },
    });

    if (!convo) {
      return NextResponse.json(
        { ok: false, error: "Conversation not found for this business" },
        { status: 404 }
      );
    }

    if (convo.channel !== "whatsapp") {
      return NextResponse.json(
        { ok: false, error: "Channel not supported yet" },
        { status: 400 }
      );
    }

    const wa = await prisma.channelAccount.findFirst({
      where: { businessId, channel: "whatsapp" },
      orderBy: { createdAt: "desc" },
      select: {
        providerAccountId: true,
        displayNumber: true,
        config: true,
      },
    });

    if (!wa) {
      return NextResponse.json(
        { ok: false, error: "WhatsApp no conectado para este negocio" },
        { status: 400 }
      );
    }

    const token =
      typeof (wa.config as any)?.accessToken === "string" &&
      (wa.config as any).accessToken.trim()
        ? String((wa.config as any).accessToken).trim()
        : process.env.WHATSAPP_ACCESS_TOKEN || "";

    const phoneNumberId = String(wa.providerAccountId || "").trim();

    if (!token || !phoneNumberId) {
      return NextResponse.json(
        {
          ok: false,
          error: "WhatsApp mal configurado (token o phoneNumberId)",
        },
        { status: 500 }
      );
    }

    const fromPhone = wa.displayNumber
      ? normalizePhone(String(wa.displayNumber))
      : "";

    const toPhone = normalizePhone(convo.contactKey);

    if (!toPhone) {
      return NextResponse.json(
        { ok: false, error: "Número de destinatario inválido" },
        { status: 400 }
      );
    }

    const waTo = toWhatsAppRecipient(toPhone);

    const result = await prisma.$transaction(async (tx) => {
      const outbox = await tx.outboxMessage.create({
        data: {
          businessId,
          conversationId,
          channel: "whatsapp",
          contactKey: toPhone,
          payload: {
            type: "text",
            text: { body: text },
          },
          status: "PENDING",
          attemptCount: 0,
          nextAttemptAt: new Date(),
        },
        select: { id: true },
      });

      const msg = await tx.message.create({
        data: {
          businessId,
          conversationId,
          direction: "OUTBOUND",
          provider: "whatsapp",
          providerMessageId: null,
          fromPhone,
          toPhone,
          text,
          payload: { outboxId: outbox.id },
          status: "QUEUED",
        },
        select: { id: true },
      });

      // ✅ evita cross-tenant update (usa updateMany)
      await tx.conversation.updateMany({
        where: { id: conversationId, businessId },
        data: { lastMessageAt: new Date() },
      });

      return { outbox, msg };
    });

    const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;

    async function sendToWhatsApp(payload: any) {
      const r = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await r.json().catch(() => ({}));
      return { waRes: r, waData: data };
    }

    const payloadText = {
      messaging_product: "whatsapp",
      to: waTo,
      type: "text",
      text: { body: text },
    };

    const payloadTemplate = {
      messaging_product: "whatsapp",
      to: waTo,
      type: "template",
      template: {
        name: "jaspers_market_plain_text_v1",
        language: { code: "en_US" },
      },
    };

    let usedTemplate = false;

    let { waRes, waData } = await sendToWhatsApp(payloadText);

    if (!waRes.ok) {
      const msg = String(
        waData?.error?.message ?? waData?.error?.error_user_msg ?? ""
      ).toLowerCase();

      const shouldFallbackToTemplate =
        msg.includes("template") ||
        msg.includes("24") ||
        msg.includes("hours") ||
        msg.includes("session");

      if (shouldFallbackToTemplate) {
        usedTemplate = true;
        ({ waRes, waData } = await sendToWhatsApp(payloadTemplate));
      }
    }

    if (!waRes.ok) {
      const errMsg =
        waData?.error?.message ??
        waData?.error?.error_user_msg ??
        `HTTP ${waRes.status}`;

      await prisma.$transaction(async (tx) => {
        await tx.outboxMessage.updateMany({
          where: { id: result.outbox.id, businessId },
          data: { status: "FAILED", lastError: errMsg },
        });

        await tx.message.updateMany({
          where: { id: result.msg.id, businessId },
          data: {
            status: "FAILED",
            payload: {
              outboxId: result.outbox.id,
              sendStatus: "FAILED",
              sendError: errMsg,
              failedAt: new Date().toISOString(),
              usedTemplate,
              templateName: usedTemplate
                ? "jaspers_market_plain_text_v1"
                : null,
              waTo,
            },
          },
        });
      });

      return NextResponse.json(
        { ok: false, error: errMsg, meta: waData },
        { status: 502 }
      );
    }

    const wamid =
      waData?.messages?.[0]?.id ?? waData?.messages?.[0]?.message_id ?? null;

    await prisma.$transaction(async (tx) => {
      await tx.outboxMessage.updateMany({
        where: { id: result.outbox.id, businessId },
        data: { status: "SENT", lastError: null },
      });

      await tx.message.updateMany({
        where: { id: result.msg.id, businessId },
        data: {
          providerMessageId: wamid,
          status: "SENT",
          payload: {
            outboxId: result.outbox.id,
            sendStatus: "SENT",
            sentAt: new Date().toISOString(),
            usedTemplate,
            templateName: usedTemplate ? "jaspers_market_plain_text_v1" : null,
            waTo,
          },
        },
      });
    });

    return NextResponse.json({
      ok: true,
      outboxId: result.outbox.id,
      messageId: result.msg.id,
      wamid,
      usedTemplate,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
