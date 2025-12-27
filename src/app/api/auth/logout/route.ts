import { NextRequest, NextResponse } from "next/server";
import { COOKIE_BID, COOKIE_GATE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const url = new URL(req.url);

  const res = NextResponse.redirect(new URL("/login", url.origin));

  res.cookies.set(COOKIE_GATE, "", {
    httpOnly: true,
    path: "/",
    expires: new Date(0),
  });

  res.cookies.set(COOKIE_BID, "", {
    httpOnly: true,
    path: "/",
    expires: new Date(0),
  });

  return res;
}
