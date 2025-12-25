import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import OnboardingForm from "./OnboardingForm";

function safeNext(next: unknown) {
  const n = typeof next === "string" ? next.trim() : "";
  if (n && n.startsWith("/")) return n;
  return null;
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next = safeNext(sp?.next);

  const cookieStore = await cookies();
  const gate = cookieStore.get("booking_gate")?.value;
  const bid = cookieStore.get("booking_bid")?.value;

  if (gate !== "1")
    redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);

  // si ya hay negocio seleccionado, no tiene sentido estar aquí
  if (bid) redirect(next ?? "/inbox");

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow">
        <h1 className="text-xl font-semibold text-white">
          Create your business
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          This is required to keep data separated per client.
        </p>

        <div className="mt-6">
          <OnboardingForm next={next ?? "/inbox"} />
        </div>
      </div>
    </main>
  );
}
