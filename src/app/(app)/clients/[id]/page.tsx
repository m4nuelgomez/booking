import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireBusinessId } from "@/lib/auth";
import OpenClientChatButton from "./OpenClientChatButton";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const businessId = await requireBusinessId();

  const client = await prisma.client.findFirst({
    where: { id, businessId },
    select: {
      id: true,
      name: true,
      phone: true,
      notes: true,
      conversations: {
        // si hay varias, preferimos la más reciente por lastMessageAt/updatedAt
        orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
        select: { id: true },
        take: 1,
      },
      appointments: {
        orderBy: { startsAt: "desc" },
        select: {
          id: true,
          startsAt: true,
          endsAt: true,
          service: true,
          status: true,
        },
      },
    },
  });

  if (!client) {
    return <div className="text-sm text-zinc-400">Cliente no encontrado.</div>;
  }

  const existingConversationId = client.conversations[0]?.id ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold truncate">
            {client.name ?? client.phone}
          </h1>
          <p className="text-sm text-zinc-400">{client.phone}</p>
        </div>

        {/* ✅ Botón robusto: si existe chat abre directo; si no, lo asegura y abre */}
        <div className="flex items-center gap-2">
          <OpenClientChatButton
            clientId={client.id}
            existingConversationId={existingConversationId}
          />

          <Link
            href="/clients"
            className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
          >
            Volver
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30">
        <div className="border-b border-zinc-800 px-4 py-3 text-sm text-zinc-300">
          Historial de citas
        </div>

        {client.appointments.length === 0 ? (
          <div className="px-4 py-8 text-sm text-zinc-400">
            Sin citas registradas.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {client.appointments.map((a) => (
              <li key={a.id} className="px-4 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-zinc-400">
                      {new Date(a.startsAt).toLocaleString("es-MX")}
                    </div>
                    <div className="mt-1 text-sm">
                      {a.service ?? "Servicio"}
                    </div>
                  </div>
                  <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-300">
                    {a.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
