// src/app/api/webhooks/whatsapp/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PROVIDER = "whatsapp";

function getDefaultBusinessId() {
  const id = process.env.DEFAULT_BUSINESS_ID;
  if (!id) throw new Error("Missing env DEFAULT_BUSINESS_ID");
  return id;
}

/**
 * Intenta extraer 1 mensaje del payload típico de WhatsApp Cloud API.
 * Si no es un mensaje (ej. statuses), regresa null.
 */
function extractWhatsappMessage(payload: any) {
  const entry = payload?.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;

  const message = value?.messages?.[0];
  if (!message) return null;

  const fromPhone = String(message.from ?? ""); // teléfono del cliente (wa_id)
  const providerMessageId = message.id ? String(message.id) : null;

  const text =
    message.type === "text"
      ? String(message.text?.body ?? "")
      : null;

  // “toPhone” en Cloud API muchas veces viene como metadata.phone_number_id (no es teléfono real)
  const toPhone =
    value?.metadata?.phone_number_id
      ? String(value.metadata.phone_number_id)
      : "";

  return {
    eventType: change?.field ? String(change.field) : "messages",
    fromPhone,
    toPhone,
    providerMessageId,
    text,
    rawMessage: message,
  };
}

/**
 * WhatsApp Cloud requiere verificación GET cuando registras el webhook.
 * - hub.mode=subscribe
 * - hub.verify_token=...
 * - hub.challenge=...
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expected = process.env.WHATSAPP_VERIFY_TOKEN;

  // Si aún no lo configuras, no rompemos: respondemos 200 simple para dev local
  if (!expected) {
    return new NextResponse("OK (no verify token configured)", { status: 200 });
  }

  if (mode === "subscribe" && token === expected && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: Request) {
  const businessId = getDefaultBusinessId();

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  // 1) Guardar RAW siempre
  const raw = await prisma.webhookEvent.create({
    data: {
      businessId,
      provider: PROVIDER,
      eventType: payload?.entry?.[0]?.changes?.[0]?.field ?? null,
      payload,
      status: "RECEIVED",
    },
    select: { id: true },
  });

  // 2) Intentar normalizar si hay un mensaje
  try {
    const extracted = extractWhatsappMessage(payload);

    // Si no es mensaje (statuses, etc.), solo marcamos como PROCESSED y salimos
    if (!extracted) {
      await prisma.webhookEvent.update({
        where: { id: raw.id },
        data: { status: "PROCESSED", processedAt: new Date() },
      });

      return NextResponse.json({ ok: true, processed: false, reason: "No message in payload" });
    }

    const contactPhone = extracted.fromPhone;

    // Upsert conversación por (businessId, contactPhone)
    const conversation = await prisma.conversation.upsert({
      where: {
        businessId_contactPhone: { businessId, contactPhone },
      },
      create: {
        businessId,
        contactPhone,
        lastMessageAt: new Date(),
      },
      update: {
        lastMessageAt: new Date(),
      },
      select: { id: true },
    });

    // Insert message con idempotencia si viene providerMessageId
    // OJO: si providerMessageId es null, la unique no ayuda.
    // Para MVP: lo guardamos igual. Luego mejoramos dedupe usando hash del payload.
    await prisma.message.create({
      data: {
        businessId,
        conversationId: conversation.id,
        direction: "INBOUND",
        provider: PROVIDER,
        providerMessageId: extracted.providerMessageId,
        fromPhone: extracted.fromPhone,
        toPhone: extracted.toPhone,
        text: extracted.text,
        payload: extracted.rawMessage,
      },
    }).catch(async (err: any) => {
      // Si es duplicado por @@unique([provider, providerMessageId]), lo ignoramos
      // Prisma suele dar code P2002 para unique constraint
      if (err?.code === "P2002") return;
      throw err;
    });

    // Marcar RAW como PROCESSED
    await prisma.webhookEvent.update({
      where: { id: raw.id },
      data: { status: "PROCESSED", processedAt: new Date() },
    });

    return NextResponse.json({ ok: true, processed: true });
  } catch (err: any) {
    // Marcar RAW como FAILED
    await prisma.webhookEvent.update({
      where: { id: raw.id },
      data: { status: "FAILED" },
    });

    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}