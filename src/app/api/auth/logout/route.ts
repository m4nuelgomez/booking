import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const res = NextResponse.redirect(new URL("/login", url.origin));

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
