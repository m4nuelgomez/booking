import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireBusinessId } from "@/lib/auth";
import WhatsAppSettingsCard from "./WhatsAppSettingsCard";
import DashboardAutoRefresh from "./DashboardAutoRefresh";

export const dynamic = "force-dynamic";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function startOfTomorrow() {
  const d = startOfToday();
  d.setDate(d.getDate() + 1);
  return d;
}

export default async function DashboardPage() {
  const businessId = await requireBusinessId();

  const from = startOfToday();
  const to = startOfTomorrow();

  const [apptToday, unreadAgg, nextAppts, recentConvos] = await Promise.all([
    prisma.appointment.count({
      where: {
        businessId,
        startsAt: { gte: from, lt: to },
        status: "SCHEDULED",
      },
    }),

    prisma.conversation.aggregate({
      where: { businessId },
      _sum: { unreadCount: true },
    }),

    prisma.appointment.findMany({
      where: {
        businessId,
        startsAt: { gte: new Date() },
        status: "SCHEDULED",
      },
      orderBy: { startsAt: "asc" },
      take: 5,
      select: {
        id: true,
        startsAt: true,
        service: true,
        client: { select: { id: true, name: true, phone: true } },
        conversationId: true,
      },
    }),

    prisma.conversation.findMany({
      where: { businessId },
      orderBy: { lastMessageAt: "desc" },
      take: 5,
      select: {
        id: true,
        contactPhone: true,
        lastMessageAt: true,
        unreadCount: true,
        client: { select: { id: true, name: true, phone: true } },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { direction: true, text: true, createdAt: true },
        },
      },
    }),
  ]);

  const unread = unreadAgg._sum.unreadCount ?? 0;

  return (
    <div className="space-y-6">
      <DashboardAutoRefresh ms={3000} />
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-zinc-400">Resumen rápido de hoy</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
          <div className="text-sm text-zinc-400">Citas hoy</div>
          <div className="mt-2 text-3xl font-semibold">{apptToday}</div>
          <div className="mt-3">
            <Link
              href="/app/agenda"
              className="text-sm text-emerald-400 hover:underline"
            >
              Ver agenda
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
          <div className="text-sm text-zinc-400">Mensajes sin leer</div>
          <div className="mt-2 text-3xl font-semibold">{unread}</div>
          <div className="mt-3">
            <Link
              href="/app/inbox"
              className="text-sm text-emerald-400 hover:underline"
            >
              Abrir inbox
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
          <div className="text-sm text-zinc-400">Próximas citas</div>
          <div className="mt-2 text-3xl font-semibold">{nextAppts.length}</div>
          <div className="mt-3">
            <Link
              href="/app/agenda"
              className="text-sm text-emerald-400 hover:underline"
            >
              Agendar nueva
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
          <div className="text-sm text-zinc-400">Clientes</div>
          <div className="mt-2 text-3xl font-semibold">→</div>
          <div className="mt-3">
            <Link
              href="/app/clients"
              className="text-sm text-emerald-400 hover:underline"
            >
              Ver clientes
            </Link>
          </div>
        </div>
      </div>

      <WhatsAppSettingsCard />

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <div className="text-sm text-zinc-300">Próximas citas</div>
          <Link
            href="/app/agenda"
            className="text-sm text-emerald-400 hover:underline"
          >
            Ver todo
          </Link>
        </div>

        {nextAppts.length === 0 ? (
          <div className="px-4 py-8 text-sm text-zinc-400">
            No hay citas próximas.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {nextAppts.map((a) => {
              const who = a.client?.name ?? a.client?.phone ?? "Cliente";
              const when = new Date(a.startsAt).toLocaleString("es-MX");
              return (
                <li key={a.id} className="px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm text-zinc-400">{when}</div>
                      <div className="mt-1 text-base font-semibold">{who}</div>
                      <div className="mt-1 text-sm text-zinc-300">
                        {a.service ?? "Servicio"}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {a.conversationId ? (
                        <Link
                          href={`/app/inbox/${a.conversationId}`}
                          className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-900"
                        >
                          Chat
                        </Link>
                      ) : null}

                      {a.client?.id ? (
                        <Link
                          href={`/app/clients/${a.client.id}`}
                          className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-900"
                        >
                          Cliente
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <div className="text-sm text-zinc-300">Conversaciones recientes</div>
          <Link
            href="/app/inbox"
            className="text-sm text-emerald-400 hover:underline"
          >
            Abrir inbox
          </Link>
        </div>

        {recentConvos.length === 0 ? (
          <div className="px-4 py-8 text-sm text-zinc-400">
            Aún no hay conversaciones.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {recentConvos.map((c) => {
              const who = c.client?.name ?? c.contactPhone;
              const last = c.messages[0]?.text ?? "";
              const you = c.messages[0]?.direction === "OUTBOUND";
              const when = c.lastMessageAt
                ? new Date(c.lastMessageAt).toLocaleString("es-MX")
                : "";

              return (
                <li key={c.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-base font-semibold">{who}</div>
                      <div className="mt-1 text-sm text-zinc-400">
                        {you ? "Tú: " : ""}
                        {last || "—"}
                      </div>
                      <div className="mt-2 text-xs text-zinc-500">{when}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      {c.unreadCount > 0 ? (
                        <span className="rounded-full bg-emerald-600 px-2 py-1 text-xs font-semibold text-white">
                          {c.unreadCount}
                        </span>
                      ) : null}
                      <Link
                        href={`/app/inbox/${c.id}`}
                        className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-900"
                      >
                        Abrir
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
