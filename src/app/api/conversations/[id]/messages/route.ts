import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const businessId = process.env.DEFAULT_BUSINESS_ID;
  if (!businessId) {
    return NextResponse.json(
      { ok: false, error: "Missing DEFAULT_BUSINESS_ID" },
      { status: 500 }
    );
  }

  const msgs = await prisma.message.findMany({
    where: { conversationId: id, businessId },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: {
      id: true,
      direction: true,
      text: true,
      createdAt: true,
      providerMessageId: true,
    },
  });

  return NextResponse.json({ ok: true, messages: msgs });
}
