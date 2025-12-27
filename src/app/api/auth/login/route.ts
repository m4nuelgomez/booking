import { NextRequest, NextResponse } from "next/server";

const COOKIE_GATE = "booking_gate";
const COOKIE_ADMIN = "booking_admin";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

export async function POST(req: NextRequest) {
  const { password, next } = await req
    .json()
    .catch(() => ({ password: "", next: "" }));

  const appPass = process.env.APP_GATE_PASSWORD;
  const adminPass = process.env.ADMIN_GATE_PASSWORD;

  if (!appPass || !adminPass) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Configuración del servidor incompleta. Faltan contraseñas de acceso.",
      },
      { status: 500 }
    );
  }

  const isAdmin = Boolean(password) && password === adminPass;
  const isApp = Boolean(password) && password === appPass;

  if (!isAdmin && !isApp) {
    return NextResponse.json(
      { ok: false, error: "La contraseña es incorrecta." },
      { status: 401 }
    );
  }

  const rawNext = typeof next === "string" ? next.trim() : "";
  const isInternal = rawNext.startsWith("/");

  let redirectTo = "/app/inbox";

  if (isAdmin) {
    redirectTo = isInternal ? rawNext : "/admin/businesses";
    if (!redirectTo.startsWith("/admin")) redirectTo = "/admin/businesses";
  } else {
    redirectTo = isInternal ? rawNext : "/app/inbox";
    if (!redirectTo.startsWith("/app")) redirectTo = "/app/inbox";
  }

  const res = NextResponse.json({
    ok: true,
    role: isAdmin ? "admin" : "app",
    redirectTo,
  });

  res.cookies.set({
    name: COOKIE_GATE,
    value: "1",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });

  if (isAdmin) {
    res.cookies.set({
      name: COOKIE_ADMIN,
      value: "1",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: MAX_AGE_SECONDS,
    });
  } else {
    res.cookies.set({
      name: COOKIE_ADMIN,
      value: "0",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }

  return res;
}
