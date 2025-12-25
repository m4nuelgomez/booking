import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";

export const runtime = "nodejs";

const PROVIDER = "whatsapp";

async function resolveBusinessAndToPhone(payload: any) {
  const entry = payload?.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;

  const phoneNumberId = value?.metadata?.phone_number_id
    ? String(value.metadata.phone_number_id)
    : null;

  if (!phoneNumberId) {
    throw new Error(
      "Missing metadata.phone_number_id (cannot resolve business)"
    );
  }

  const wa = await prisma.whatsAppAccount.findFirst({
    where: { phoneNumberId },
    select: { businessId: true, displayNumber: true, phoneNumberId: true },
  });

  if (!wa) {
    throw new Error(
      `WhatsAppAccount not found for phoneNumberId=${phoneNumberId}. Create mapping first.`
    );
  }

  const display = value?.metadata?.display_phone_number
    ? String(value.metadata.display_phone_number)
    : wa.displayNumber
    ? String(wa.displayNumber)
    : "";

  const toPhone = normalizePhone(display) || display;

  return {
    businessId: wa.businessId,
    phoneNumberId: wa.phoneNumberId,
    toPhone,
  };
}

function extractWhatsappMessage(payload: any) {
  const entry = payload?.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;

  const message = value?.messages?.[0];
  if (!message) return null;

  const fromPhone = normalizePhone(message.from ?? "");
  const providerMessageId = message.id ? String(message.id) : null;

  const text = message.type === "text" ? message.text?.body ?? "" : null;

  const phoneNumberId = value?.metadata?.phone_number_id
    ? String(value.metadata.phone_number_id)
    : null;

  return {
    eventType: change?.field ? String(change.field) : "messages",
    fromPhone,
    phoneNumberId,
    providerMessageId,
    text,
    rawMessage: message,
  };
}

async function handleWhatsappStatuses(businessId: string, payload: any) {
  const entry = payload?.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;

  const statuses = value?.statuses;
  if (!Array.isArray(statuses) || statuses.length === 0) return 0;

  let processed = 0;

  for (const s of statuses) {
    const wamid = s?.id ? String(s.id) : null;
    const status = s?.status ? String(s.status) : null;
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
        data: { status: "DELIVERED", deliveredAt: ts, updatedAt: new Date() },
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
        data: { status: "READ", readAt: ts, updatedAt: new Date() },
      });
      processed++;
      continue;
    }

    if (status === "sent") {
      await prisma.message.updateMany({
        where: {
          businessId,
          provider: PROVIDER,
          providerMessageId: wamid,
          direction: "OUTBOUND",
        },
        data: { status: "SENT", updatedAt: new Date() },
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
    return new NextResponse("Missing WHATSAPP_VERIFY_TOKEN", { status: 500 });
  }

  if (mode === "subscribe" && token === expected && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: Request) {
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

  let businessId: string;
  let toPhone: string;
  let phoneNumberId: string;

  try {
    const resolved = await resolveBusinessAndToPhone(payload);
    businessId = resolved.businessId;
    toPhone = resolved.toPhone;
    phoneNumberId = resolved.phoneNumberId;
  } catch (e: any) {
    console.error("[WA] BUSINESS_RESOLVE_FAILED", e?.message ?? e);
    return NextResponse.json({
      ok: true,
      processed: false,
      reason: e?.message ?? "Unknown phoneNumberId",
    });
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
    const statusesProcessed = await handleWhatsappStatuses(businessId, payload);

    const extracted = extractWhatsappMessage(payload);

    console.log("[WA] extracted", {
      businessId,
      phoneNumberId,
      eventType: extracted?.eventType,
      fromPhone: extracted?.fromPhone,
      toPhone,
      providerMessageId: extracted?.providerMessageId,
      text: extracted?.text,
      hasStatuses: Array.isArray(
        payload?.entry?.[0]?.changes?.[0]?.value?.statuses
      ),
    });

    // Solo statuses (sin inbound message)
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

    let conversation = await prisma.conversation.upsert({
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
      select: { id: true, clientId: true },
    });

    if (!conversation.clientId) {
      const existingClient = await prisma.client.findFirst({
        where: { businessId, phone: contactPhone },
        select: { id: true },
      });

      if (existingClient) {
        conversation = await prisma.conversation.update({
          where: { id: conversation.id },
          data: { clientId: existingClient.id },
          select: { id: true, clientId: true },
        });
      }
    }

    let createdMessageId: string | null = null;
    let duplicate = false;

    try {
      const created = await prisma.message.create({
        data: {
          businessId,
          conversationId: conversation.id,
          direction: "INBOUND",
          provider: PROVIDER,
          providerMessageId: extracted.providerMessageId,
          fromPhone: extracted.fromPhone,
          toPhone, // ✅ correcto
          text: extracted.text,
          payload: extracted.rawMessage,
          status: "DELIVERED",
        },
        select: { id: true },
      });

      createdMessageId = created.id;
    } catch (err: any) {
      if (err?.code === "P2002") duplicate = true;
      else throw err;
    }

    if (!duplicate) {
      await prisma.conversation.updateMany({
        where: { id: conversation.id, businessId },
        data: {
          unreadCount: { increment: 1 },
          lastMessageAt: new Date(),
        },
      });
    }

    await prisma.webhookEvent.update({
      where: { id: raw.id },
      data: { status: "PROCESSED", processedAt: new Date() },
    });

    console.log("[WA] processed", {
      rawEventId: raw.id,
      statusesProcessed,
      createdMessageId,
      duplicate,
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
