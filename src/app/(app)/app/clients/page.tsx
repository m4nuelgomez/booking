import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireBusinessId } from "@/lib/auth";

function previewText(input?: string) {
  const s = (input ?? "").trim();
  if (!s) return "Sin mensajes todavía.";
  const oneLine = s.replace(/\s+/g, " ");
  return oneLine.length > 60 ? oneLine.slice(0, 60) + "…" : oneLine;
}

function relativeTime(date?: Date | string | null) {
  if (!date) return "Sin actividad";
  const t = new Date(date).getTime();
  const ms = Date.now() - t;
  const min = Math.floor(ms / 60000);
  if (min < 1) return "Justo ahora";
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Ayer";
  return `Hace ${d} días`;
}

function initials(nameOrPhone: string) {
  const s = (nameOrPhone ?? "").trim();
  if (!s) return "??";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

function formatPhoneDisplay(raw: string) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (s.startsWith("+")) return s;
  const digits = s.replace(/[^\d]/g, "");
  if (!digits) return s;
  if (digits.startsWith("52") && digits.length === 12) {
    const ten = digits.slice(2);
    return `+52 ${ten.slice(0, 3)} ${ten.slice(3, 6)} ${ten.slice(6)}`;
  }
  if (digits.length === 10) {
    return `+52 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return s.startsWith("+") ? s : `+${digits}`;
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; selected?: string }>;
}) {
  const { q = "", selected } = await searchParams;
  const businessId = await requireBusinessId();

  const query = q.trim();

  const clients = await prisma.client.findMany({
    where: {
      businessId,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { phone: { contains: query } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      name: true,
      phone: true,
      notes: true,
      updatedAt: true,
      _count: { select: { appointments: true, conversations: true } },
      conversations: {
        orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
        take: 1,
        select: {
          id: true,
          lastMessageAt: true,
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { text: true, direction: true },
          },
        },
      },
    },
  });

  const selectedClient =
    (selected && clients.find((c) => c.id === selected)) || null;

  const selectedConvo = selectedClient?.conversations?.[0] ?? null;
  const selectedLastMsg = selectedConvo?.messages?.[0] ?? null;

  const countLabel =
    clients.length === 1 ? "1 cliente" : `${clients.length} clientes`;

  return (
    <div className="space-y-4">
      {/* ✅ Back to Dashboard (orientación) */}
      <div className="pt-2">
        <Link
          href="/app/dashboard"
          className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300"
        >
          ← Dashboard
        </Link>
      </div>

      {/* ✅ Header con aire */}
      <div className="flex flex-wrap items-end justify-between gap-3 py-4">
        <div className="pt-2">
          <h1 className="text-3xl font-semibold tracking-tight">Clientes</h1>
          <p className="mt-1 text-sm text-zinc-400">{countLabel}</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/app/clients/new"
            className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
          >
            Nuevo cliente
          </Link>

          {/* Search: mantiene q (y opcionalmente selected si quieres) */}
          <form action="/app/clients" className="flex items-center">
            {selected ? (
              <input type="hidden" name="selected" value={selected} />
            ) : null}
            <input
              name="q"
              defaultValue={query}
              placeholder="Buscar por nombre o teléfono…"
              className="w-72 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-700/40"
            />
          </form>
        </div>
      </div>

      {/* ✅ Separación para que “respire” */}
      <div className="h-1" />

      {/* 2 columnas */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left: lista */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30">
          <div className="border-b border-zinc-800 px-4 py-3 text-sm font-medium text-zinc-200">
            Clientes recientes
          </div>

          {clients.length === 0 ? (
            <div className="px-4 py-10 text-sm text-zinc-400">
              No hay clientes aún.
            </div>
          ) : (
            <ul className="divide-y divide-zinc-800">
              {clients.map((c) => {
                const convo = c.conversations?.[0] ?? null;
                const lastMsg = convo?.messages?.[0] ?? null;
                const lastText = lastMsg?.text ?? "";
                const prefix = lastMsg?.direction === "OUTBOUND" ? "Tú: " : "";
                const name = c.name ?? c.phone;
                const isSelected = selectedClient?.id === c.id;

                const href = `/app/clients?${new URLSearchParams({
                  ...(query ? { q: query } : {}),
                  selected: c.id,
                }).toString()}`;

                return (
                  <li key={c.id}>
                    <Link
                      href={href}
                      className={[
                        "flex items-center justify-between gap-3 px-4 py-4",
                        "hover:bg-zinc-900/60",
                        isSelected ? "bg-zinc-900/60" : "bg-transparent",
                      ].join(" ")}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-full border border-zinc-800 bg-zinc-950 flex items-center justify-center text-xs font-semibold text-zinc-200">
                          {initials(c.name ?? c.phone)}
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-zinc-100">
                            {name}
                          </div>
                          <div className="truncate text-xs text-zinc-500">
                            {formatPhoneDisplay(c.phone)}
                          </div>
                          <div
                            className={[
                              "mt-1 truncate text-sm",
                              lastText
                                ? "text-zinc-300"
                                : "text-zinc-400 italic",
                            ].join(" ")}
                          >
                            {prefix}
                            {previewText(lastText)}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <div className="text-xs text-zinc-500">
                          {relativeTime(convo?.lastMessageAt ?? null)}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-300">
                            Citas: {c._count.appointments}
                          </span>
                          <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-300">
                            Chats: {c._count.conversations}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Right: mini-perfil */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30">
          {!selectedClient ? (
            <div className="p-6">
              <div className="text-sm font-medium text-zinc-200">
                Selecciona un cliente
              </div>
              <div className="mt-1 text-sm text-zinc-400">
                Verás notas y un botón de chat sin navegar.
              </div>

              <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
                Tip: esta columna hace que se vea “enterprise” aunque el MVP sea
                simple.
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {/* header mini */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-lg font-semibold text-zinc-100 truncate">
                    {selectedClient.name ?? "Cliente WhatsApp"}
                  </div>
                  <div className="text-sm text-zinc-400">
                    {formatPhoneDisplay(selectedClient.phone)}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    Última actividad:{" "}
                    {relativeTime(selectedConvo?.lastMessageAt ?? null)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/app/clients/${selectedClient.id}`}
                    className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
                  >
                    Abrir
                  </Link>
                  <Link
                    href={
                      selectedConvo?.id ? `/app/inbox/${selectedConvo.id}` : "#"
                    }
                    className={[
                      "rounded-lg px-3 py-2 text-sm",
                      selectedConvo?.id
                        ? "bg-emerald-600 text-white hover:bg-emerald-500"
                        : "bg-zinc-800 text-zinc-500 cursor-not-allowed",
                    ].join(" ")}
                    aria-disabled={!selectedConvo?.id}
                  >
                    Chat
                  </Link>
                </div>
              </div>

              {/* ultimo mensaje */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <div className="text-xs text-zinc-500">Último mensaje</div>
                <div className="mt-1 text-sm text-zinc-200">
                  {selectedLastMsg ? (
                    <>
                      <span className="text-zinc-400">
                        {selectedLastMsg.direction === "OUTBOUND" ? "Tú: " : ""}
                      </span>
                      {previewText(selectedLastMsg.text ?? undefined)}
                    </>
                  ) : (
                    <span className="text-zinc-400 italic">
                      Sin mensajes todavía.
                    </span>
                  )}
                </div>
              </div>

              {/* notas */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <div className="text-xs text-zinc-500">Notas</div>
                <div className="mt-1 text-sm text-zinc-300">
                  {selectedClient.notes ? (
                    selectedClient.notes
                  ) : (
                    <span className="text-zinc-400 italic">Sin notas.</span>
                  )}
                </div>
              </div>

              {/* quick stats */}
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-300">
                  📅 {selectedClient._count.appointments} cita(s)
                </span>
                <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-300">
                  💬 {selectedClient._count.conversations} chat(s)
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
