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
      updatedAt: true,
    } as const;

    // DTO fechas
    const toDTO = (m: any) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
      deliveredAt: m.deliveredAt ? m.deliveredAt.toISOString() : null,
      readAt: m.readAt ? m.readAt.toISOString() : null,
    });

    // ✅ valida tenant
    const convo = await prisma.conversation.findFirst({
      where: { id: conversationId, businessId },
      select: { id: true },
    });

    // ✅ para polling: si no existe/no pertenece, responde vacío (NO 404)
    if (!convo) {
      return NextResponse.json({
        ok: true,
        messages: [],
        updates: [],
        now: now.toISOString(),
      });
    }

    // ✅ updates solo outbound y por tenant
    const updates = sinceOk
      ? await prisma.message.findMany({
          where: {
            businessId,
            conversationId,
            direction: "OUTBOUND",
            updatedAt: { gt: sinceDate! },
          },
          orderBy: { updatedAt: "asc" },
          take: 200,
          select,
        })
      : [];

    let messages: any[] = [];

    if (after) {
      const cursorMsg = await prisma.message.findFirst({
        where: { id: after, conversationId, businessId },
        select: { id: true, createdAt: true },
      });

      // ✅ cursor inválido: no romper polling (NO 400)
      if (!cursorMsg) {
        return NextResponse.json({
          ok: true,
          messages: [],
          updates: updates.map(toDTO),
          now: now.toISOString(),
        });
      }

      messages = await prisma.message.findMany({
        where: {
          businessId,
          conversationId,
          OR: [
            { createdAt: { gt: cursorMsg.createdAt } },
            {
              AND: [
                { createdAt: { equals: cursorMsg.createdAt } },
                { id: { gt: cursorMsg.id } },
              ],
            },
          ],
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: TAKE,
        select,
      });
    } else {
      const latest = await prisma.message.findMany({
        where: { businessId, conversationId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: TAKE,
        select,
      });

      messages = latest.reverse();
    }

    return NextResponse.json({
      ok: true,
      messages: messages.map(toDTO),
      updates: updates.map(toDTO),
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
