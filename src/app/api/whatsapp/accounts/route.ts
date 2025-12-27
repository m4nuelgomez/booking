import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusinessIdFromReq } from "@/lib/auth-api";

export async function GET(req: NextRequest) {
  const auth = requireBusinessIdFromReq(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status }
    );
  }

  const businessId = auth.businessId;

  const accounts = await prisma.channelAccount.findMany({
    where: { businessId, channel: "whatsapp" },
    select: {
      id: true,
      providerAccountId: true,
      displayNumber: true,
      displayName: true,
      config: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const mapped = accounts.map((a) => ({
    id: a.id,
    phoneNumberId: a.providerAccountId,
    displayNumber: a.displayNumber,
    wabaId: (a.config as any)?.wabaId ?? null,
    isActive: a.isActive,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  }));

  return NextResponse.json({ ok: true, accounts: mapped });
}
