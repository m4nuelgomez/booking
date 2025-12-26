import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusinessIdFromReq } from "@/lib/auth-api";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params;

  const auth = requireBusinessIdFromReq(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status }
    );
  }
  const businessId = auth.businessId;

  const body = await req.json().catch(() => ({}));
  const clientId = body?.clientId ? String(body.clientId).trim() : null; // null = unlink

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1) validar que la conversación sea del business
      const convo = await tx.conversation.findFirst({
        where: { id: conversationId, businessId },
        select: { id: true, clientId: true },
      });

      if (!convo) {
        return {
          ok: false as const,
          status: 404,
          payload: { ok: false, error: "Conversation not found" },
        };
      }

      // 2) UNLINK
      if (!clientId) {
        const updated = await tx.conversation.update({
          where: { id: convo.id },
          data: { clientId: null },
          select: {
            id: true,
            clientId: true,
            client: { select: { id: true, name: true, phone: true } },
          },
        });

        return {
          ok: true as const,
          status: 200,
          payload: { ok: true, conversation: updated },
        };
      }

      // 3) validar cliente (mismo business)
      const client = await tx.client.findFirst({
        where: { id: clientId, businessId },
        select: { id: true },
      });

      if (!client) {
        return {
          ok: false as const,
          status: 404,
          payload: { ok: false, error: "Client not found" },
        };
      }

      // 4) LINK (solo actualiza Conversation)
      const updated = await tx.conversation.update({
        where: { id: convo.id },
        data: { clientId },
        select: {
          id: true,
          clientId: true,
          client: { select: { id: true, name: true, phone: true } },
        },
      });

      return {
        ok: true as const,
        status: 200,
        payload: { ok: true, conversation: updated },
      };
    });

    return NextResponse.json(result.payload, { status: result.status });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
