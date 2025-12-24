import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_BUSINESS_ID = process.env.DEFAULT_BUSINESS_ID ?? "dev-business";
const TAKE = 50;

function formatTime(d: Date) {
  return d.toISOString();
}

export async function GET(req: NextRequest) {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { businessId: DEFAULT_BUSINESS_ID },
      orderBy: { lastMessageAt: "desc" },
      take: TAKE,
      select: { id: true, contactPhone: true, lastMessageAt: true },
    });

    const rows = await Promise.all(
      conversations.map(async (c) => {
        const last = await prisma.message.findFirst({
          where: { businessId: DEFAULT_BUSINESS_ID, conversationId: c.id },
          orderBy: { createdAt: "desc" },
          select: { text: true, direction: true },
        });

        return {
          id: c.id,
          contactPhone: c.contactPhone,
          lastMessageAt: c.lastMessageAt ? formatTime(c.lastMessageAt) : null,
          lastText: (last?.text ?? "").trim(),
          lastDirection: last?.direction ?? null,
        };
      })
    );

    return NextResponse.json({ ok: true, rows });
  } catch (err) {
    console.error("CONVERSATIONS_LIST_FAILED", err);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
