import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_BUSINESS_ID = process.env.DEFAULT_BUSINESS_ID ?? "dev-business";
const TAKE = 50;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const conversationId = searchParams.get("conversationId");
    const after = searchParams.get("after");
    const since = searchParams.get("since");

    if (!conversationId) {
      return NextResponse.json(
        { ok: false, error: "conversationId is required" },
        { status: 400 }
      );
    }

    const convo = await prisma.conversation.findFirst({
      where: { id: conversationId, businessId: DEFAULT_BUSINESS_ID },
      select: { id: true },
    });

    if (!convo) {
      return NextResponse.json(
        { ok: false, error: "Conversation not found" },
        { status: 404 }
      );
    }

    const now = new Date();

    const sinceDate = since ? new Date(since) : null;
    const sinceOk = !!sinceDate && !Number.isNaN(sinceDate.getTime());

    const select = {
      id: true,
      direction: true,
      text: true,
      createdAt: true,
      providerMessageId: true,
      payload: true,
      status: true,
      deliveredAt: true,
      readAt: true,
    } as const;

    const updates = sinceOk
      ? await prisma.message.findMany({
          where: {
            businessId: DEFAULT_BUSINESS_ID,
            conversationId,
            direction: "OUTBOUND",
            updatedAt: { gt: sinceDate! },
          },
          orderBy: { createdAt: "asc" },
          take: TAKE,
          select,
        })
      : [];

    let messages: any[] = [];

    if (after) {
      const cursorOk = await prisma.message.findFirst({
        where: { id: after, conversationId, businessId: DEFAULT_BUSINESS_ID },
        select: { id: true },
      });

      if (!cursorOk) {
        return NextResponse.json(
          { ok: false, error: "Invalid cursor (after)" },
          { status: 400 }
        );
      }

      messages = await prisma.message.findMany({
        where: { conversationId, businessId: DEFAULT_BUSINESS_ID },
        orderBy: { createdAt: "asc" },
        cursor: { id: after },
        skip: 1,
        take: TAKE,
        select,
      });
    } else {
      const latest = await prisma.message.findMany({
        where: { conversationId, businessId: DEFAULT_BUSINESS_ID },
        orderBy: { createdAt: "desc" },
        take: TAKE,
        select,
      });

      messages = latest.reverse();
    }

    return NextResponse.json({
      ok: true,
      messages,
      updates,
      now: now.toISOString(),
    });
  } catch (err: any) {
    console.error("MESSAGES_LIST_FAILED", err);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
