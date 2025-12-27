import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

export const COOKIE_GATE = "booking_gate";
export const COOKIE_BID = "booking_bid";
export const COOKIE_ADMIN = "booking_admin";

export async function requireGate() {
  const cookieStore = await cookies();
  const gate = cookieStore.get(COOKIE_GATE)?.value;
  if (gate !== "1") redirect("/login");
}

export async function requireAdmin() {
  await requireGate();
  const cookieStore = await cookies();
  const admin = cookieStore.get(COOKIE_ADMIN)?.value;
  if (admin !== "1") redirect("/login");
}

export async function requireBusinessId() {
  await requireGate();
  const cookieStore = await cookies();
  const bid = cookieStore.get(COOKIE_BID)?.value;
  if (!bid) redirect("/onboarding");
  return bid;
}

export async function setBusinessIdCookie(businessId: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_BID, businessId, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
}

type AuthOk = { ok: true; businessId: string };
type AuthFail = { ok: false; status: number; error: string };

export function requireBusinessIdFromReq(req: NextRequest): AuthOk | AuthFail {
  const gate = req.cookies.get(COOKIE_GATE)?.value;
  if (gate !== "1") {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const bid = req.cookies.get(COOKIE_BID)?.value;
  if (!bid) {
    return { ok: false, status: 401, error: "Missing businessId" };
  }

  return { ok: true, businessId: bid };
}

type AdminOk = { ok: true };
type AdminFail = { ok: false; status: number; error: string };

export function requireAdminFromReq(req: NextRequest): AdminOk | AdminFail {
  const gate = req.cookies.get(COOKIE_GATE)?.value;
  if (gate !== "1") {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const admin = req.cookies.get(COOKIE_ADMIN)?.value;
  if (admin !== "1") {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  return { ok: true };
}
