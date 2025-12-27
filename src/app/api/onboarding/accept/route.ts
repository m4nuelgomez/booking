import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COOKIE_BID, COOKIE_GATE } from "@/lib/auth";

function cleanStr(x: unknown) {
  return typeof x === "string" ? x.trim() : "";
}

function normalizeNext(nextRaw: unknown) {
  const next = cleanStr(nextRaw);

  if (!next.startsWith("/")) return "";
  if (!next.startsWith("/app")) return "";
  if (next.startsWith("//")) return "";

  return next;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const token = cleanStr(url.searchParams.get("token"));
  const next = normalizeNext(url.searchParams.get("next"));

  if (!token) {
    return NextResponse.redirect(new URL("/onboarding", url));
  }

  const record = await prisma.onboardingToken.findUnique({
    where: { token },
    select: { token: true, expiresAt: true, businessId: true },
  });

  if (!record || record.expiresAt < new Date()) {
    return NextResponse.redirect(new URL("/onboarding?token=INVALID", url));
  }

  const biz = await prisma.business.findFirst({
    where: { id: record.businessId, deletedAt: null },
    select: { id: true },
  });

  if (!biz) {
    return NextResponse.redirect(
      new URL("/onboarding?token=BUSINESS_UNAVAILABLE", url)
    );
  }

  await prisma.onboardingToken.delete({ where: { token: record.token } });

  const hasGate = req.cookies.get(COOKIE_GATE)?.value === "1";

  const target = hasGate
    ? next || "/app/dashboard"
    : `/login?next=${encodeURIComponent(next || "/app/dashboard")}`;

  const res = NextResponse.redirect(new URL(target, url));

  res.cookies.set(COOKIE_BID, record.businessId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });

  return res;
}
