import { NextRequest } from "next/server";
import { COOKIE_ADMIN, COOKIE_BID, COOKIE_GATE } from "@/lib/auth";

export function requireGateFromReq(req: NextRequest) {
  const gate = req.cookies.get(COOKIE_GATE)?.value;
  if (gate !== "1") {
    return { ok: false as const, status: 401, error: "No autorizado" };
  }
  return { ok: true as const };
}

export function requireAdminFromReq(req: NextRequest) {
  const gate = req.cookies.get(COOKIE_GATE)?.value;
  if (gate !== "1") {
    return { ok: false as const, status: 401, error: "No autorizado" };
  }

  const admin = req.cookies.get(COOKIE_ADMIN)?.value;
  if (admin !== "1") {
    return {
      ok: false as const,
      status: 403,
      error: "Acceso solo para administrador",
    };
  }

  return { ok: true as const };
}

export function requireBusinessIdFromReq(req: NextRequest) {
  const gate = req.cookies.get(COOKIE_GATE)?.value;
  if (gate !== "1") {
    return { ok: false as const, status: 401, error: "No autorizado" };
  }

  const bid = req.cookies.get(COOKIE_BID)?.value;
  if (!bid) {
    return {
      ok: false as const,
      status: 401,
      error: "No hay negocio seleccionado",
    };
  }

  return { ok: true as const, businessId: bid };
}
