import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import DashboardAutoRefresh from "./DashboardAutoRefresh";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Booking — Admin",
};

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

const DAY = 24 * 60 * 60 * 1000;
const PRICE_MXN = 399;

/* =========================
   TYPES
========================= */

type Row = {
  id: string;
  name: string;
  status: "🟢" | "🟡" | "🔴";
  msgsTotal: number;
  clientsTotal: number;
  outboxTotal: number;
  webhookTotal: number;
  waLinked: boolean;
  createdAt: Date;
};

type BusinessRow = Prisma.BusinessGetPayload<{
  select: {
    id: true;
    name: true;
    createdAt: true;
    waAccounts: { select: { id: true } };
    _count: {
      select: {
        messages: true;
        clients: true;
        outbox: true;
        webhookEvents: true;
      };
    };
  };
}>;

/* =========================
   PAGE
========================= */

export default async function AdminDashboardPage() {
  const since = new Date(Date.now() - DAY);
  const from = startOfToday();
  const to = startOfTomorrow();

  /* -------- KPIs (Promise.all solo con scalars) -------- */

  const [
    businessCount,
    messages24h,
    inbound24h,
    outbound24h,
    unreadConvos,
    unreadAgg,
    apptsToday,
  ] = await Promise.all([
    prisma.business.count(),

    prisma.message.count({
      where: { createdAt: { gte: since } },
    }),

    prisma.message.count({
      where: { createdAt: { gte: since }, direction: "INBOUND" },
    }),

    prisma.message.count({
      where: { createdAt: { gte: since }, direction: "OUTBOUND" },
    }),

    prisma.conversation.count({
      where: { unreadCount: { gt: 0 } },
    }),

    prisma.conversation.aggregate({
      _sum: { unreadCount: true },
    }),

    prisma.appointment.count({
      where: {
        startsAt: { gte: from, lt: to },
        status: "SCHEDULED",
      },
    }),
  ]);

  /* -------- Negocios (query tipada, SIN Promise.all) -------- */

  const topBusinesses: BusinessRow[] = await prisma.business.findMany({
    orderBy: { createdAt: "desc" },
    take: 25,
    select: {
      id: true,
      name: true,
      createdAt: true,
      waAccounts: { select: { id: true } },
      _count: {
        select: {
          messages: true,
          clients: true,
          outbox: true,
          webhookEvents: true,
        },
      },
    },
  });

  /* -------- Derived values -------- */

  const unreadTotal = unreadAgg._sum.unreadCount ?? 0;
  const potentialMRR = businessCount * PRICE_MXN;

  const pctOut =
    messages24h === 0 ? 0 : Math.round((outbound24h / messages24h) * 100);
  const pctIn = messages24h === 0 ? 0 : 100 - pctOut;

  /* -------- Rows (100% typed) -------- */

  const rows: Row[] = topBusinesses.map((b: BusinessRow) => {
    const msgs = b._count.messages;
    const clients = b._count.clients;
    const outbox = b._count.outbox;
    const webhook = b._count.webhookEvents;
    const waLinked = b.waAccounts.length > 0;

    const status: Row["status"] = msgs > 0 ? "🟢" : clients > 0 ? "🟡" : "🔴";

    return {
      id: b.id,
      name: b.name,
      status,
      msgsTotal: msgs,
      clientsTotal: clients,
      outboxTotal: outbox,
      webhookTotal: webhook,
      waLinked,
      createdAt: b.createdAt,
    };
  });

  rows.sort((a: Row, b: Row) => {
    if (b.msgsTotal !== a.msgsTotal) return b.msgsTotal - a.msgsTotal;
    if (b.clientsTotal !== a.clientsTotal)
      return b.clientsTotal - a.clientsTotal;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="p-6 space-y-8">
      <DashboardAutoRefresh intervalMs={3000} visibleOnly />

      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">BOOKING — OJO DE DIOS</h1>
          <p className="text-sm text-zinc-400">Visión global del sistema</p>
        </div>
        <div className="text-xs text-zinc-500">
          Últimas 24h · {new Date().toLocaleString("es-MX")}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
        <Kpi label="Negocios" value={businessCount} />
        <Kpi label="Mensajes 24h" value={messages24h} />
        <Kpi label="Inbound 24h" value={`${pctIn}%`} />
        <Kpi label="Outbound 24h" value={`${pctOut}%`} />
        <Kpi label="Citas hoy" value={apptsToday} />
        <Kpi label="Conv. con unread" value={unreadConvos} />
        <Kpi label="Mensajes sin leer" value={unreadTotal} />
      </div>

      {/* Salud */}
      <div className="grid gap-3 md:grid-cols-3">
        <Panel title="Conversaciones con unread">
          <div className="text-3xl font-semibold">{unreadConvos}</div>
          <div className="mt-2 text-sm text-zinc-400">
            Si esto sube, tus negocios están dejando dinero en la mesa.
          </div>
        </Panel>

        <Panel title="Negocios linkeados a WhatsApp">
          <div className="text-3xl font-semibold">
            {rows.filter((r) => r.waLinked).length} / {rows.length}
          </div>
          <div className="mt-2 text-sm text-zinc-400">
            Sin link no hay valor.
          </div>
        </Panel>

        <Panel title="Regla CEO">
          <div className="text-sm text-zinc-300">
            🟢 usa el sistema · 🟡 tiene clientes · 🔴 muerto
          </div>
          <div className="mt-2 text-sm text-zinc-400">
            Convierte 🟡→🟢 con onboarding y WhatsApp real.
          </div>
        </Panel>
      </div>

      {/* Tabla */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <div className="text-sm text-zinc-300">Negocios</div>
          <div className="text-xs text-zinc-500">Top {rows.length}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-zinc-400">
              <tr className="border-b border-zinc-800">
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Negocio</th>
                <th className="px-4 py-3">Mensajes</th>
                <th className="px-4 py-3">Clientes</th>
                <th className="px-4 py-3">Outbox</th>
                <th className="px-4 py-3">Webhooks</th>
                <th className="px-4 py-3">WA</th>
                <th className="px-4 py-3">Creado</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-zinc-800/70">
                  <td className="px-4 py-3">{r.status}</td>
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3">{r.msgsTotal}</td>
                  <td className="px-4 py-3">{r.clientsTotal}</td>
                  <td className="px-4 py-3">{r.outboxTotal}</td>
                  <td className="px-4 py-3">{r.webhookTotal}</td>
                  <td className="px-4 py-3">{r.waLinked ? "✅" : "—"}</td>
                  <td className="px-4 py-3 text-zinc-400">
                    {r.createdAt.toLocaleString("es-MX")}
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-zinc-400">
                    Aún no hay negocios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-zinc-500">
        Nota: v1 usa conteos totales por negocio. En v2 agregamos métricas 24h
        por negocio con groupBy.
      </div>
    </div>
  );
}

/* =========================
   UI
========================= */

function Kpi({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
      <div className="text-sm text-zinc-300">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
