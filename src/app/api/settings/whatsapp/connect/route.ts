import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE_BID = "booking_bid";

function cleanStr(x: unknown) {
  return typeof x === "string" ? x.trim() : "";
}

function safeNumberLike(x: string) {
  return x.replace(/\s+/g, "");
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
  const phoneNumberId = cleanStr(body?.phoneNumberId);
  const displayNumber = safeNumberLike(cleanStr(body?.displayNumber));
  const wabaId = cleanStr(body?.wabaId);
  const accessToken = cleanStr(body?.accessToken);

  if (!phoneNumberId) {
    return NextResponse.json(
      { ok: false, error: "phoneNumberId requerido" },
      { status: 400 }
    );
  }
  if (!displayNumber) {
    return NextResponse.json(
      { ok: false, error: "displayNumber requerido" },
      { status: 400 }
    );
  }
  if (!wabaId) {
    return NextResponse.json(
      { ok: false, error: "wabaId requerido" },
      { status: 400 }
    );
  }

  const config = {
    wabaId,
    phoneNumberId,
    ...(accessToken ? { accessToken } : {}),
  };

  const existing = await prisma.channelAccount.findUnique({
    where: {
      channel_providerAccountId: {
        channel: "whatsapp",
        providerAccountId: phoneNumberId,
      },
    },
    select: { id: true, businessId: true },
  });

  if (existing && existing.businessId !== bid) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Este phoneNumberId ya está vinculado a otro negocio. Desvincúlalo primero.",
      },
      { status: 409 }
    );
  }

  await prisma.channelAccount.upsert({
    where: {
      channel_providerAccountId: {
        channel: "whatsapp",
        providerAccountId: phoneNumberId,
      },
    },
    create: {
      businessId: bid,
      channel: "whatsapp",
      providerAccountId: phoneNumberId,
      displayName: "WhatsApp",
      displayNumber,
      config,
    },
    update: {
      displayNumber,
      config,
    },
  });

  return NextResponse.json({ ok: true });
}
