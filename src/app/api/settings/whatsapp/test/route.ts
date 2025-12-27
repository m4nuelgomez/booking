import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE_BID = "booking_bid";

function cleanStr(x: unknown) {
  return typeof x === "string" ? x.trim() : "";
}

function jsonObj(x: unknown): Record<string, any> {
  return x && typeof x === "object" ? (x as any) : {};
}

export async function POST(req: NextRequest) {
  const bid = (await cookies()).get(COOKIE_BID)?.value || "";
  if (!bid) {
    return NextResponse.json(
      { ok: false, error: "Missing business" },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const to = cleanStr(body?.to).replace(/\D/g, "");
  if (!to) {
    return NextResponse.json(
      { ok: false, error: "Missing 'to'" },
      { status: 400 }
    );
  }

  const wa = await prisma.channelAccount.findFirst({
    where: { businessId: bid, channel: "whatsapp" },
    orderBy: { createdAt: "desc" },
    select: { id: true, config: true },
  });

  if (!wa) {
    return NextResponse.json(
      { ok: false, error: "WhatsApp no conectado" },
      { status: 400 }
    );
  }

  const cfg = jsonObj(wa.config);

  // Ajusta estas keys a tu config real si difieren
  const accessToken = cleanStr(cfg.accessToken ?? cfg.WHATSAPP_ACCESS_TOKEN);
  const phoneNumberId = cleanStr(
    cfg.phoneNumberId ?? cfg.WHATSAPP_PHONE_NUMBER_ID
  );

  if (!accessToken || !phoneNumberId) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Faltan credenciales en ChannelAccount.config (accessToken / phoneNumberId)",
      },
      { status: 400 }
    );
  }

  // Envío directo a WhatsApp Cloud API
  const url = `https://graph.facebook.com/v22.0/${encodeURIComponent(
    phoneNumberId
  )}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: {
      body: "✅ Prueba de Booking: tu WhatsApp está conectado correctamente.",
    },
  };

  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: data?.error?.message ?? "WhatsApp API error",
        details: data,
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, provider: data });
}
