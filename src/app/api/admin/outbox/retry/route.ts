import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isAdmin(req: NextRequest) {
  return req.cookies.get("booking_admin")?.value === "1";
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await req.json().catch(() => ({ id: "" }));
  if (!id || typeof id !== "string") {
    return NextResponse.json(
      { ok: false, error: "Missing id" },
      { status: 400 }
    );
  }

  const row = await prisma.outboxMessage.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!row) {
    return NextResponse.json(
      { ok: false, error: "OutboxMessage not found" },
      { status: 404 }
    );
  }

  if (row.status !== "FAILED") {
    return NextResponse.json(
      { ok: false, error: "Only FAILED messages can be retried" },
      { status: 400 }
    );
  }

  const now = new Date();

  const updated = await prisma.outboxMessage.update({
    where: { id },
    data: {
      status: "PENDING",
      nextAttemptAt: now,
      lastError: null,
    },
    select: {
      id: true,
      status: true,
      nextAttemptAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ ok: true, outbox: updated });
}
