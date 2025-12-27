import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  const cookieStore = await cookies();
  const businessId = cookieStore.get("booking_bid")?.value;

  if (!businessId) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const channel = await prisma.channelAccount.findFirst({
    where: {
      businessId,
      channel: "whatsapp",
    },
  });

  if (!channel) {
    return NextResponse.json({ ok: true });
  }

  await prisma.channelAccount.update({
    where: { id: channel.id },
    data: {
      isActive: false,
      config: {},
    },
  });

  return NextResponse.json({ ok: true });
}
