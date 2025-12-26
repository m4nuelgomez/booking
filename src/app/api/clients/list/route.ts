import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusinessId } from "@/lib/auth";

const TAKE = 50;

export async function GET(req: NextRequest) {
  let businessId: string;
  try {
    businessId = await requireBusinessId();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  const segment = (searchParams.get("segment") ?? "all").trim();

  const now = Date.now();
  const created7dCutoff = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const inactive30dCutoff = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const segmentWhere =
    segment === "created7d"
      ? { createdAt: { gte: created7dCutoff } }
      : segment === "inactive30d"
      ? {
          OR: [
            { conversations: { none: {} } },
            { conversations: { some: { lastMessageAt: null } } },
            {
              conversations: {
                some: { lastMessageAt: { lt: inactive30dCutoff } },
              },
            },
          ],
        }
      : {};

  const clients = await prisma.client.findMany({
    where: {
      businessId,
      ...segmentWhere,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
            ],
          }
        : {}),
    },

    orderBy: { updatedAt: "desc" },
    take: TAKE,
    select: {
      id: true,
      name: true,
      phone: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { appointments: true, conversations: true } },
      conversations: {
        orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
        take: 1,
        select: {
          id: true,
          unreadCount: true,
          lastMessageAt: true,
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { text: true, direction: true, createdAt: true },
          },
        },
      },
    },
  });

  const rows = clients.map((c) => {
    const convo = c.conversations?.[0] ?? null;
    const lastMsg = convo?.messages?.[0] ?? null;

    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      appointmentsCount: c._count.appointments,
      conversationsCount: c._count.conversations,
      conversationId: convo?.id ?? null,
      unreadCount: convo?.unreadCount ?? 0,
      lastMessageAt: convo?.lastMessageAt ?? null,
      lastMessageText: lastMsg?.text ?? "",
      lastMessageDir: lastMsg?.direction ?? null,
      lastMessageCreatedAt: lastMsg?.createdAt ?? null,
    };
  });

  return NextResponse.json(
    { ok: true, rows },
    { headers: { "Cache-Control": "no-store" } }
  );
}
