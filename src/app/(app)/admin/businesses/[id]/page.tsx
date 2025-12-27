import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import GenerateOnboardingLinkButton from "../GenerateOnboardingLinkButton";
import ImpersonateBusinessButton from "../ImpersonateBusinessButton";

function fmt(d: Date) {
  return d.toLocaleString();
}

function relativeTime(d: Date) {
  const ms = Date.now() - d.getTime();
  if (ms < 0) return "ahora";

  const s = Math.floor(ms / 1000);
  if (s < 10) return "ahora";
  if (s < 60) return `hace ${s}s`;

  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m}m`;

  const h = Math.floor(m / 60);
  if (h < 48) return `hace ${h}h`;

  const days = Math.floor(h / 24);
  if (days < 30) return `hace ${days}d`;

  const months = Math.floor(days / 30);
  return `hace ${months}mo`;
}

function daysLeft(expiresAt: Date) {
  const ms = expiresAt.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function Badge({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "muted";
  children: React.ReactNode;
}) {
  const cls =
    tone === "ok"
      ? "bg-green-500/15 text-green-300 border-green-500/20"
      : tone === "warn"
      ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/20"
      : "bg-white/5 text-white/60 border-white/10";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${cls}`}
    >
      {children}
    </span>
  );
}

export default async function AdminBusinessDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const b = await prisma.business.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      createdAt: true,
      _count: {
        select: { conversations: true, clients: true, appointments: true },
      },
      onboardingTokens: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true, expiresAt: true },
      },
    },
  });

  if (!b) {
    return <div className="text-white/70">Negocio no encontrado.</div>;
  }

  const lastToken = b.onboardingTokens?.[0] ?? null;
  const tokenActive = lastToken ? lastToken.expiresAt > new Date() : false;

  const wa = await prisma.channelAccount.findFirst({
    where: { businessId: b.id, channel: "whatsapp" },
    orderBy: { createdAt: "desc" },
    select: {
      providerAccountId: true,
      displayName: true,
      displayNumber: true,
      config: true,
      createdAt: true,
    },
  });

  const lastConvo = await prisma.conversation.findFirst({
    where: { businessId: b.id },
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
    select: { lastMessageAt: true },
  });

  return (
    <div className="space-y-4">
      {/* Inline nav (sin topbar duplicado) */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/businesses"
          className="text-sm text-white/70 underline"
        >
          ← Volver a negocios
        </Link>

        <Link
          href="/admin/businesses/new"
          className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/5"
        >
          Crear otro
        </Link>
      </div>

      {/* MAIN CARD */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-5">
        {/* HEADER */}
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">{b.name}</h1>
          <div className="text-xs text-white/50 font-mono break-all">
            {b.id}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Badge tone={wa ? "ok" : "warn"}>
              WhatsApp: {wa ? "Conectado" : "No conectado"}
            </Badge>

            <Badge tone={lastConvo?.lastMessageAt ? "ok" : "muted"}>
              Actividad:{" "}
              {lastConvo?.lastMessageAt
                ? relativeTime(lastConvo.lastMessageAt)
                : "—"}
            </Badge>

            <Badge tone={lastToken ? (tokenActive ? "ok" : "warn") : "muted"}>
              Onboarding:{" "}
              {!lastToken ? "Nunca" : tokenActive ? "Activo" : "Expirado"}
            </Badge>
          </div>
        </div>

        {/* KPIS */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-white/60 text-xs">Chats</div>
            <div className="font-semibold">{b._count.conversations}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-white/60 text-xs">Clientes</div>
            <div className="font-semibold">{b._count.clients}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-white/60 text-xs">Citas</div>
            <div className="font-semibold">{b._count.appointments}</div>
          </div>
        </div>

        {/* ONBOARDING */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
          <div className="text-sm font-medium">Acceso (Onboarding)</div>

          {lastToken && (
            <div className="text-xs text-white/50">
              Último link: {fmt(lastToken.createdAt)} · expira en{" "}
              {daysLeft(lastToken.expiresAt)} día(s)
            </div>
          )}

          <div className="flex gap-2">
            <GenerateOnboardingLinkButton businessId={b.id} variant="copy" />
            <GenerateOnboardingLinkButton businessId={b.id} variant="open" />
          </div>
        </div>

        {/* QUICK ACTIONS — ÚNICO LUGAR PARA ENTRAR */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
          <div className="text-sm font-medium">Acciones rápidas</div>

          <div className="flex flex-wrap gap-2">
            <ImpersonateBusinessButton
              businessId={b.id}
              next="/app/dashboard"
              label="Abrir Dashboard"
              className="rounded-xl bg-white text-black px-4 py-2 text-sm font-medium"
            />
            <ImpersonateBusinessButton
              businessId={b.id}
              next="/app/inbox"
              label="Abrir Bandeja"
            />
            <ImpersonateBusinessButton
              businessId={b.id}
              next="/app/agenda"
              label="Abrir Agenda"
            />
            <ImpersonateBusinessButton
              businessId={b.id}
              next="/app/clients"
              label="Abrir Clientes"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
