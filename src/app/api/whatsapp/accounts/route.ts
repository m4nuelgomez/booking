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

  const accounts = await prisma.whatsAppAccount.findMany({
    where: { businessId },
    select: {
      id: true,
      phoneNumberId: true,
      displayNumber: true,
      wabaId: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, accounts });
}
