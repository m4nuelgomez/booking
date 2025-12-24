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
    const statusesProcessed = await handleWhatsappStatuses(businessId, payload);

    const extracted = extractWhatsappMessage(payload);

    console.log("[WA] extracted", {
      businessId,
      eventType: extracted?.eventType,
      fromPhone: extracted?.fromPhone,
      toPhone: extracted?.toPhone,
      providerMessageId: extracted?.providerMessageId,
      text: extracted?.text,
      hasStatuses: Array.isArray(
        payload?.entry?.[0]?.changes?.[0]?.value?.statuses
      ),
    });

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

    console.log("[WA] conversation upserted", {
      businessId,
      contactPhone,
      conversationId: conversation.id,
    });

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
          toPhone: extracted.toPhone,
          text: extracted.text,
          payload: extracted.rawMessage,
          status: "SENT",
        },
        select: { id: true },
      });

      createdMessageId = created.id;
    } catch (err: any) {
      if (err?.code === "P2002") {
        duplicate = true;
      } else {
        throw err;
      }
    }

    console.log("[WA] message write", {
      businessId,
      conversationId: conversation.id,
      providerMessageId: extracted.providerMessageId,
      createdMessageId,
      duplicate,
    });

    if (!duplicate) {
      const updatedConversation = await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          unreadCount: { increment: 1 },
          lastMessageAt: new Date(),
        },
        select: {
          unreadCount: true,
        },
      });

      console.log("[WA] unreadCount++", {
        conversationId: conversation.id,
        unreadCount: updatedConversation.unreadCount,
      });
    }

    await prisma.webhookEvent.update({
      where: { id: raw.id },
      data: { status: "PROCESSED", processedAt: new Date() },
    });

    console.log("[WA] processed", { rawEventId: raw.id, statusesProcessed });

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
