import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const PROVIDER = "whatsapp";

function getDefaultBusinessId() {
  const id = process.env.DEFAULT_BUSINESS_ID;
  if (!id) throw new Error("Missing env DEFAULT_BUSINESS_ID");
  return id;
}

function extractWhatsappMessage(payload: any) {
  const entry = payload?.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;

  const message = value?.messages?.[0];
  if (!message) return null;

  const fromPhone = message.from ?? "";
  const providerMessageId = message.id ? String(message.id) : null;

  const text = message.type === "text" ? message.text?.body ?? "" : null;

  const toPhone = value?.metadata?.display_phone_number
    ? String(value.metadata.display_phone_number)
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
 * WhatsApp status webhooks: delivered / read (and sometimes sent)
 * Updates outbound messages by providerMessageId (wamid).
 * Returns how many status items were processed.
 */
async function handleWhatsappStatuses(businessId: string, payload: any) {
  const entry = payload?.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;

  const statuses = value?.statuses;
  if (!Array.isArray(statuses) || statuses.length === 0) return 0;

  let processed = 0;

  for (const s of statuses) {
    const wamid = s?.id ? String(s.id) : null;
    const status = s?.status ? String(s.status) : null; // "sent" | "delivered" | "read"
    const ts = s?.timestamp ? new Date(Number(s.timestamp) * 1000) : new Date();

    if (!wamid || !status) continue;

    if (status === "delivered") {
      await prisma.message.updateMany({
        where: {
          businessId,
          provider: PROVIDER,
          providerMessageId: wamid,
          direction: "OUTBOUND",
        },
        data: { status: "DELIVERED", deliveredAt: ts },
      });
      processed++;
      continue;
    }

    if (status === "read") {
      await prisma.message.updateMany({
        where: {
          businessId,
          provider: PROVIDER,
          providerMessageId: wamid,
          direction: "OUTBOUND",
        },
        data: { status: "READ", readAt: ts },
      });
      processed++;
      continue;
    }

    if (status === "sent") {
      // opcional: por si llega status "sent" vía webhook
      await prisma.message.updateMany({
        where: {
          businessId,
          provider: PROVIDER,
          providerMessageId: wamid,
          direction: "OUTBOUND",
        },
        data: { status: "SENT" },
      });
      processed++;
      continue;
    }
  }

  return processed;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expected = process.env.WHATSAPP_VERIFY_TOKEN;

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
    const rawBody = await req.arrayBuffer();
    const jsonText = new TextDecoder("utf-8").decode(rawBody);
    payload = JSON.parse(jsonText);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

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

  try {
    // 1) Primero procesamos statuses (palomitas)
    const statusesProcessed = await handleWhatsappStatuses(businessId, payload);

    // 2) Luego procesamos inbound messages como ya lo haces
    const extracted = extractWhatsappMessage(payload);

    if (!extracted) {
      await prisma.webhookEvent.update({
        where: { id: raw.id },
        data: { status: "PROCESSED", processedAt: new Date() },
      });

      return NextResponse.json({
        ok: true,
        processed: statusesProcessed > 0,
        statusesProcessed,
        reason:
          statusesProcessed > 0
            ? "Statuses processed (no inbound message)"
            : "No message in payload",
      });
    }

    const contactPhone = extracted.fromPhone;

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

    await prisma.message
      .create({
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

          // 👇 opcional pero recomendado para que INBOUND no quede como QUEUED
          status: "SENT",
        },
      })
      .catch(async (err: any) => {
        if (err?.code === "P2002") return; // idempotencia provider+providerMessageId
        throw err;
      });

    await prisma.webhookEvent.update({
      where: { id: raw.id },
      data: { status: "PROCESSED", processedAt: new Date() },
    });

    return NextResponse.json({
      ok: true,
      processed: true,
      statusesProcessed,
    });
  } catch (err: any) {
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
