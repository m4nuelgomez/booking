import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusinessIdFromReq } from "@/lib/auth-api";

export async function POST(req: NextRequest) {
  const auth = requireBusinessIdFromReq(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status }
    );
  }
  const businessId = auth.businessId;

  const body = await req.json().catch(() => ({}));

  const phoneNumberId = String(body?.phoneNumberId ?? "").trim();
  const wabaId = body?.wabaId ? String(body.wabaId).trim() : null;
  const displayNumber = body?.displayNumber
    ? String(body.displayNumber).trim()
    : null;

  if (!phoneNumberId) {
    return NextResponse.json(
      { ok: false, error: "phoneNumberId is required" },
      { status: 400 }
    );
  }

  const account = await prisma.whatsAppAccount.upsert({
    where: { phoneNumberId },
    create: {
      businessId,
      phoneNumberId,
      wabaId,
      displayNumber,
    },
    update: {
      businessId,
      wabaId,
      displayNumber,
    },
    select: {
      id: true,
      phoneNumberId: true,
      businessId: true,
      displayNumber: true,
      wabaId: true,
    },
  });

  return NextResponse.json({ ok: true, account });
}
