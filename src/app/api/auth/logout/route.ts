import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });

  res.cookies.set("booking_gate", "", {
    httpOnly: true,
    path: "/",
    expires: new Date(0),
  });

  res.cookies.set("booking_bid", "", {
    httpOnly: true,
    path: "/",
    expires: new Date(0),
  });

  return res;
}
