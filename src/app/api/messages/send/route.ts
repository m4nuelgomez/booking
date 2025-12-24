import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function normalizeTo(toPhone: string) {
  let digits = toPhone.replace(/\D/g, "");

  if (digits.startsWith("521") && digits.length === 13) {
    digits = "52" + digits.slice(3);
  }

  return digits;
}

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

  // Env de WhatsApp
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID",
      },
      { status: 500 }
    );
  }

  try {
    // 1) Validar conversación
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

    if (!convo.contactPhone) {
      return NextResponse.json(
        { ok: false, error: "Conversation has no contactPhone" },
        { status: 400 }
      );
    }

    const toPhone = normalizeTo(convo.contactPhone);

    // 2) Guardar Outbox + Message
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
        select: { id: true },
      });

      const msg = await tx.message.create({
        data: {
          businessId,
          conversationId,
          direction: "OUTBOUND",
          provider: "whatsapp",
          providerMessageId: null,
          fromPhone: "business",
          toPhone,
          text,
          payload: { outboxId: outbox.id },

          // ✅ palomitas: arranca en QUEUED
          status: "QUEUED",
        },
        select: { id: true },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      });

      return { outbox, msg };
    });

    // 3) Envío real a WhatsApp
    const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;

    async function sendToWhatsApp(payload: any) {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      return { waRes: res, waData: data };
    }

    const payloadText = {
      messaging_product: "whatsapp",
      to: toPhone,
      type: "text",
      text: { body: text },
    };

    const payloadTemplate = {
      messaging_product: "whatsapp",
      to: toPhone,
      type: "template",
      template: {
        name: "jaspers_market_plain_text_v1",
        language: { code: "en_US" },
      },
    };

    let usedTemplate = false;

    // 1) intenta mandar el texto real
    let { waRes, waData } = await sendToWhatsApp(payloadText);

    // 2) si falla por ventana cerrada / requiere template, fallback
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
      console.error("WA_SEND_FAILED", {
        status: waRes.status,
        waData,
        toPhone,
        phoneNumberId,
      });

      const errMsg =
        waData?.error?.message ??
        waData?.error?.error_user_msg ??
        `HTTP ${waRes.status}`;

      await prisma.$transaction(async (tx) => {
        await tx.outboxMessage.update({
          where: { id: result.outbox.id },
          data: { status: "FAILED", lastError: errMsg },
        });

        await tx.message.update({
          where: { id: result.msg.id },
          data: {
            // ✅ palomitas: falla
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
            },
          },
        });
      });

      // Mantienes status 200 para UX (como ya lo haces)
      return NextResponse.json(
        { ok: false, error: errMsg, meta: waData },
        { status: 200 }
      );
    }

    const wamid =
      waData?.messages?.[0]?.id ?? waData?.messages?.[0]?.message_id ?? null;

    await prisma.$transaction(async (tx) => {
      await tx.outboxMessage.update({
        where: { id: result.outbox.id },
        data: { status: "SENT", lastError: null },
      });

      await tx.message.update({
        where: { id: result.msg.id },
        data: {
          providerMessageId: wamid,

          // ✅ palomitas: WA aceptó => SENT
          status: "SENT",

          payload: {
            outboxId: result.outbox.id,
            sendStatus: "SENT",
            sentAt: new Date().toISOString(),
            usedTemplate,
            templateName: usedTemplate ? "jaspers_market_plain_text_v1" : null,
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
