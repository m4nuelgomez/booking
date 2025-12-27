import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAdminFromReq } from "@/lib/auth-api";

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = requireAdminFromReq(req);
  if (!auth.ok) return bad(auth.error, auth.status);

  const { id } = await ctx.params;

  await prisma.onboardingToken.deleteMany({ where: { businessId: id } });

  const token = crypto.randomBytes(32).toString("hex");

  await prisma.onboardingToken.create({
    data: {
      businessId: id,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return NextResponse.json({
    ok: true,
    onboardingUrl: `/onboarding?token=${token}`,
  });
}
