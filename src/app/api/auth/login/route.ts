import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "booking_gate";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({ password: "" }));

  const expected = process.env.APP_GATE_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "Server misconfigured: APP_GATE_PASSWORD missing" },
      { status: 500 }
    );
  }

  if (!password || password !== expected) {
    return NextResponse.json(
      { ok: false, error: "Invalid password" },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ ok: true });

  res.cookies.set({
    name: COOKIE_NAME,
    value: "1",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });

  return res;
}
