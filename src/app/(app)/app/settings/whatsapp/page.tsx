import { cookies } from "next/headers";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import WhatsAppTestCard from "./WhatsAppTestCard";

const COOKIE_BID = "booking_bid";

export default async function WhatsAppSettingsPage() {
  const bid = (await cookies()).get(COOKIE_BID)?.value || "";

  if (!bid) {
    return (
      <div className="text-white/70">
        Falta negocio activo. Vuelve a onboarding.
      </div>
    );
  }

  const wa = await prisma.channelAccount.findFirst({
    where: { businessId: bid, channel: "whatsapp" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      displayName: true,
      displayNumber: true,
      providerAccountId: true,
      config: true,
      createdAt: true,
    },
  });

  const connected = !!wa;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">WhatsApp</h1>
          <p className="text-sm text-white/60">
            Conecta y prueba el canal de WhatsApp del negocio.
          </p>
        </div>

        <Link
          href="/app/settings"
          className="rounded-xl border border-white/15 px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/5"
        >
          Volver
        </Link>
      </div>

      {/* Status card */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium">Estado</div>
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${
              connected
                ? "bg-green-500/15 text-green-300 border-green-500/20"
                : "bg-yellow-500/15 text-yellow-300 border-yellow-500/20"
            }`}
          >
            {connected ? "Conectado" : "No conectado"}
          </span>
        </div>

        {!connected ? (
          <div className="text-sm text-white/60">
            Aún no hay una cuenta de WhatsApp vinculada para este negocio.
            <div className="mt-2 text-xs text-white/45">
              (Aquí después pondremos el flujo de “Conectar” paso a paso.)
            </div>
          </div>
        ) : (
          <div className="grid gap-2 text-sm">
            <div className="text-white/70">
              <span className="text-white/45">Nombre:</span>{" "}
              {wa.displayName || "—"}
            </div>
            <div className="text-white/70">
              <span className="text-white/45">Número:</span>{" "}
              {wa.displayNumber || "—"}
            </div>
            <div className="text-white/70">
              <span className="text-white/45">Provider Account:</span>{" "}
              <span className="font-mono text-xs">
                {wa.providerAccountId || "—"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Test card */}
      <WhatsAppTestCard connected={connected} />
    </div>
  );
}
