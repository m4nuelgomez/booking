import { NextRequest } from "next/server";

const COOKIE_GATE = "booking_gate";
const COOKIE_BID = "booking_bid";

export function requireBusinessIdFromReq(req: NextRequest) {
  const gate = req.cookies.get(COOKIE_GATE)?.value;
  if (gate !== "1") {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }

  const bid = req.cookies.get(COOKIE_BID)?.value;
  if (!bid) {
    return { ok: false as const, status: 401, error: "No business selected" };
  }

  return { ok: true as const, businessId: bid };
}
