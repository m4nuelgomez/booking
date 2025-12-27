import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import GenerateOnboardingLinkButton from "./GenerateOnboardingLinkButton";
import ImpersonateBusinessButton from "./ImpersonateBusinessButton";
import DeleteBusinessButton from "./DeleteBusinessButton";
import RestoreBusinessButton from "./RestoreBusinessButton";

function fmtShort(d: Date) {
  return d.toLocaleDateString();
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

function onboardingState(token: { createdAt: Date; expiresAt: Date } | null) {
  if (!token) return { label: "Nunca", tone: "muted" as const, hint: "—" };

  const active = token.expiresAt.getTime() > Date.now();
  return {
    label: active ? "Activo" : "Expirado",
    tone: active ? ("ok" as const) : ("warn" as const),
    hint: `Último: ${relativeTime(token.createdAt)}`,
  };
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

export default async function AdminBusinessesPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string }>;
}) {
  await requireAdmin();
  const sp = (await searchParams) ?? {};
  const view = sp.view ?? "active";
  const showDeleted = view === "deleted";

  const items = await prisma.business.findMany({
    where: showDeleted ? { deletedAt: { not: null } } : { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 200,
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

      channelAccounts: {
        where: { channel: "whatsapp" },
        take: 1,
        select: { id: true },
      },

      conversations: {
        orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
        take: 1,
        select: { lastMessageAt: true },
      },
    },
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Negocios</h1>
          <p className="text-sm text-white/60">
            Administra tus pilotos y clientes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/businesses"
            className={`rounded-xl px-3 py-2 text-sm font-medium ${
              !showDeleted
                ? "bg-white text-black"
                : "border border-white/15 text-white/90 hover:bg-white/5"
            }`}
          >
            Activos
          </Link>

          <Link
            href="/admin/businesses?view=deleted"
            className={`rounded-xl px-3 py-2 text-sm font-medium ${
              showDeleted
                ? "bg-white text-black"
                : "border border-white/15 text-white/90 hover:bg-white/5"
            }`}
          >
            Eliminados
          </Link>
        </div>

        {!showDeleted && (
          <div className="flex items-center gap-2">
            <Link
              href="/admin/businesses/new"
              className="rounded-xl bg-white text-black px-3 py-2 text-sm font-medium"
            >
              Crear negocio
            </Link>
          </div>
        )}
      </div>

      {/* List */}
      <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/5">
        <div className="border-b border-white/10 px-4 py-2 text-xs text-white/60">
          {items.length} negocio(s) {showDeleted ? "eliminados" : "activos"}
        </div>

        <div className="divide-y divide-white/10 bg-transparent">
          {items.map((b) => {
            const token = b.onboardingTokens?.[0] ?? null;
            const ob = onboardingState(token);

            const waConnected = (b.channelAccounts?.length ?? 0) > 0;

            const lastMessageAt = b.conversations?.[0]?.lastMessageAt ?? null;
            const activityLabel = lastMessageAt
              ? relativeTime(lastMessageAt)
              : "—";

            return (
              <div key={b.id} className="px-4 py-4 hover:bg-white/5 transition">
                <div className="flex items-start justify-between gap-4">
                  {/* Left */}
                  <div className="min-w-0 space-y-2">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/businesses/${b.id}`}
                        className="block font-medium truncate hover:underline"
                      >
                        {b.name}
                      </Link>

                      <div className="mt-1 text-xs text-white/50 font-mono truncate">
                        {b.id}
                      </div>

                      <div className="mt-1 text-[11px] text-white/40">
                        Creado: {fmtShort(b.createdAt)}
                      </div>
                    </div>

                    {/* Signals */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={ob.tone}>Onboarding: {ob.label}</Badge>
                      <span className="text-[11px] text-white/40">
                        {ob.hint}
                      </span>

                      <Badge tone={waConnected ? "ok" : "warn"}>
                        WhatsApp: {waConnected ? "Conectado" : "No conectado"}
                      </Badge>

                      <Badge tone={lastMessageAt ? "ok" : "muted"}>
                        Actividad: {activityLabel}
                      </Badge>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {!showDeleted ? (
                        <>
                          <GenerateOnboardingLinkButton
                            businessId={b.id}
                            variant="copy"
                          />
                          <GenerateOnboardingLinkButton
                            businessId={b.id}
                            variant="open"
                          />

                          <ImpersonateBusinessButton
                            businessId={b.id}
                            next="/app/dashboard"
                            label="Abrir dashboard"
                            className="rounded-xl bg-white text-black px-3 py-2 text-sm font-medium"
                          />

                          <Link
                            href={`/admin/businesses/${b.id}`}
                            className="rounded-xl border border-white/15 px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/5"
                          >
                            Ver detalle
                          </Link>

                          <DeleteBusinessButton businessId={b.id} />
                        </>
                      ) : (
                        <>
                          <Link
                            href={`/admin/businesses/${b.id}`}
                            className="rounded-xl border border-white/15 px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/5"
                          >
                            Ver detalle
                          </Link>

                          <RestoreBusinessButton businessId={b.id} />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right KPIs */}
                  <div className="text-xs text-white/60 shrink-0 text-right pt-1">
                    <div>{b._count.conversations} chats</div>
                    <div>{b._count.clients} clientes</div>
                    <div>{b._count.appointments} citas</div>
                  </div>
                </div>
              </div>
            );
          })}

          {items.length === 0 && (
            <div className="px-4 py-6 text-white/60">
              {!showDeleted
                ? "Todavía no hay negocios. Crea el primero."
                : "No hay negocios eliminados."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
