import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_GATE = "booking_gate";
const COOKIE_BID = "booking_bid";

export async function getGate() {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_GATE)?.value ?? null;
}

export async function getBusinessId() {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_BID)?.value ?? null;
}

// Para Server Components: exige gate + business
export async function requireBusinessId() {
  const cookieStore = await cookies();

  const gate = cookieStore.get(COOKIE_GATE)?.value;
  if (gate !== "1") redirect("/login");

  const bid = cookieStore.get(COOKIE_BID)?.value;
  if (!bid) redirect("/onboarding");

  return bid;
}
