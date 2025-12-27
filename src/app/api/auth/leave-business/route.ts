import { NextRequest, NextResponse } from "next/server";
import { COOKIE_BID } from "@/lib/auth";

function expireCookie(res: NextResponse, name: string) {
  res.cookies.set(name, "", {
    httpOnly: true,
    path: "/",
    expires: new Date(0),
    maxAge: 0,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/admin/businesses", req.url));
  expireCookie(res, COOKIE_BID);
  return res;
}
