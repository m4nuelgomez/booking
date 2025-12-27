import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminFromReq } from "@/lib/auth-api";
import crypto from "crypto";

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

function safeNext(next: unknown) {
  const s = typeof next === "string" ? next.trim() : "";
  if (!s || !s.startsWith("/app")) return "";
  return s;
}

export async function GET(req: NextRequest) {
  const auth = requireAdminFromReq(req);
  if (!auth.ok) return bad(auth.error, auth.status);

  const items = await prisma.business.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, createdAt: true },
    take: 200,
  });

  return NextResponse.json({
    ok: true,
    items: items.map((b) => ({
      ...b,
      createdAt: b.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const auth = requireAdminFromReq(req);
  if (!auth.ok) return bad(auth.error, auth.status);

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    next?: string;
  };

  const name = String(body?.name ?? "").trim();

  if (!name) return bad("El nombre del negocio es obligatorio.");
  if (name.length < 2) return bad("El nombre del negocio es demasiado corto.");
  if (name.length > 80)
    return bad("El nombre del negocio es demasiado largo (máx. 80).");

  const business = await prisma.business.create({
    data: { name },
    select: { id: true, name: true, createdAt: true },
  });

  const token = crypto.randomBytes(32).toString("hex");

  await prisma.onboardingToken.create({
    data: {
      businessId: business.id,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
    },
  });

  const next = safeNext(body?.next);
  const onboardingUrl = next
    ? `/onboarding?token=${token}&next=${encodeURIComponent(next)}`
    : `/onboarding?token=${token}`;

  return NextResponse.json({
    ok: true,
    business: { ...business, createdAt: business.createdAt.toISOString() },
    onboardingUrl,
  });
}
