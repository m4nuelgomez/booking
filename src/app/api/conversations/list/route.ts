import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusinessIdFromReq } from "@/lib/auth-api";

const TAKE = 50;

export async function GET(req: NextRequest) {
  try {
    const auth = requireBusinessIdFromReq(req);
    if (!auth.ok) {
      return NextResponse.json(
        { ok: false, error: auth.error },
        { status: auth.status }
      );
    }

    const businessId = auth.businessId;

    const conversations = await prisma.conversation.findMany({
      where: { businessId },
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
      take: TAKE,
      select: {
        id: true,
        channel: true,
        contactKey: true,
        contactDisplay: true,
        lastMessageAt: true,
        createdAt: true,
        unreadCount: true,
        client: {
          select: { name: true },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            text: true,
            direction: true,
            createdAt: true,
          },
        },
      },
    });

    const rows = conversations.map((c) => {
      const last = c.messages[0] ?? null;

      return {
        id: c.id,
        channel: c.channel,
        contactKey: c.contactKey,
        displayName: c.client?.name?.trim() || c.contactDisplay || c.contactKey,
        lastAt: (
          c.lastMessageAt ??
          last?.createdAt ??
          c.createdAt
        ).toISOString(),
        lastText: (last?.text ?? "").trim(),
        lastDirection: last?.direction ?? null,
        unreadCount: c.unreadCount ?? 0,
      };
    });

    return NextResponse.json({ ok: true, items: rows });
  } catch (err) {
    console.error("CONVERSATIONS_LIST_FAILED", err);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
