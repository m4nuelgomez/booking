import { NextResponse } from "next/server";

const COOKIE_NAME = "booking_gate";

export async function POST() {
  const res = NextResponse.json({ ok: true });

  res.cookies.delete(COOKIE_NAME);

  res.cookies.set({
    name: COOKIE_NAME,
    value: "",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
  });

  return res;
}
