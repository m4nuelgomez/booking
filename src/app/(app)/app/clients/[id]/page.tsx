// src/app/(app)/clients/[id]/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireBusinessId } from "@/lib/auth";
import OpenClientChatButton from "./OpenClientChatButton";
import CopyPhoneButton from "./CopyPhoneButton";

type ClientAppointment = {
  id: string;
  startsAt: Date;
  endsAt: Date | null;
  service: string | null;
  status: string;
};

type ClientConversationPreview = {
  id: string;
  lastMessageAt: Date | null;
  messages: {
    text: string | null;
    direction: "INBOUND" | "OUTBOUND";
    createdAt: Date;
  }[];
};

type ClientDetail = {
  id: string;
  name: string | null;
  phone: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  conversations: ClientConversationPreview[];
  appointments: ClientAppointment[];
  _count: {
    appointments: number;
    conversations: number;
  };
};

function formatPhoneDisplay(raw: string) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (s.startsWith("+")) return s;
  const digits = s.replace(/[^\d]/g, "");
  if (!digits) return s;

  // formateo básico MX: +52 993 346 7397 (si es +52XXXXXXXXXX)
  if (digits.startsWith("52") && digits.length === 12) {
    const ten = digits.slice(2);
    return `+52 ${ten.slice(0, 3)} ${ten.slice(3, 6)} ${ten.slice(6)}`;
  }
  if (digits.length === 10) {
    return `+52 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return s.startsWith("+") ? s : `+${digits}`;
}

function relativeTime(date: Date) {
  const ms = Date.now() - date.getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "Justo ahora";
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Ayer";
  return `Hace ${d} días`;
}

function appointmentLabel(a: { startsAt: Date; endsAt: Date | null }) {
  const start = new Date(a.startsAt);
  const end = a.endsAt ? new Date(a.endsAt) : null;

  const day = start.toLocaleDateString("es-MX", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

  const time = start.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const endTime =
    end &&
    end.toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    });

  return endTime ? `${day} · ${time}–${endTime}` : `${day} · ${time}`;
}

function statusPill(status: string) {
  const s = String(status ?? "SCHEDULED");

  const base =
    "rounded-full border px-3 py-1 text-xs font-medium inline-flex items-center gap-2";

  if (s === "CONFIRMED")
    return `${base} border-emerald-900/50 bg-emerald-950/40 text-emerald-200`;
  if (s === "CANCELED")
    return `${base} border-red-900/50 bg-red-950/35 text-red-200`;
  return `${base} border-zinc-800 bg-zinc-950 text-zinc-300`;
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const businessId = await requireBusinessId();

  const client: ClientDetail | null = await prisma.client.findFirst({
    where: { id, businessId },
    select: {
      id: true,
      name: true,
      phone: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      conversations: {
        orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
        take: 1,
        select: {
          id: true,
          lastMessageAt: true,
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              text: true,
              direction: true,
              createdAt: true,
            },
          },
        },
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
        take: 8,
      },
      _count: {
        select: { appointments: true, conversations: true },
      },
    },
  });

  if (!client) {
    return <div className="text-sm text-zinc-400">Cliente no encontrado.</div>;
  }

  const existingConversationId = client.conversations[0]?.id ?? null;
  const lastMsgAt = client.conversations[0]?.lastMessageAt ?? null;

  const lastMessage = client.conversations[0]?.messages?.[0] ?? null;

  function previewText(text: string | null | undefined) {
    if (!text) return "";
    return text.length > 60 ? text.slice(0, 60) + "…" : text;
  }

  const title = client.name ?? "Cliente WhatsApp";
  const phoneDisplay = formatPhoneDisplay(client.phone);

  return (
    <div className="space-y-6">
      {/* ✅ Todo vive dentro de la misma grid para que el layout se sienta “cuadrado” */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Header (full width dentro de la grid) */}
        <div className="lg:col-span-3">
          {/* Header */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              {/* Left */}
              <div className="min-w-0 max-w-3xl">
                <Link
                  href="/app/clients"
                  className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200"
                >
                  <span className="text-zinc-500">←</span>
                  <span>Clientes</span>
                </Link>

                <div className="mt-3 flex items-start gap-3">
                  {/* Avatar */}
                  <div className="h-10 w-10 shrink-0 rounded-full border border-zinc-800 bg-zinc-950 flex items-center justify-center text-sm font-semibold text-zinc-200">
                    {(title?.trim()?.[0] ?? "C").toUpperCase()}
                  </div>

                  {/* Title + meta */}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-semibold leading-tight truncate">
                        {title}
                      </h1>

                      {/* Badge provider */}
                      <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-300">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        WhatsApp
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-zinc-400">
                      <span className="select-text">{phoneDisplay}</span>
                      <span className="text-zinc-600">·</span>
                      <span>
                        Última actividad:{" "}
                        {lastMsgAt
                          ? relativeTime(new Date(lastMsgAt))
                          : "Sin actividad"}
                      </span>
                    </div>

                    {/* Chips */}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-300">
                        📅 {client._count.appointments} cita
                        {client._count.appointments === 1 ? "" : "s"}
                      </span>
                      <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-300">
                        💬 {client._count.conversations} chat
                        {client._count.conversations === 1 ? "" : "s"}
                      </span>
                      <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-300">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              lastMsgAt ? "bg-emerald-500" : "bg-zinc-600"
                            }`}
                          />
                          {lastMsgAt ? "Activo" : "Nuevo"}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <OpenClientChatButton
                  clientId={client.id}
                  existingConversationId={existingConversationId}
                />

                <Link
                  href={`/app/agenda?clientId=${client.id}`}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
                  title="Agendar una cita para este cliente"
                >
                  Agendar cita
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Left (main) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Actividad reciente */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30">
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <div className="text-sm font-medium text-zinc-200">
                Actividad reciente
              </div>
              <Link
                href={
                  existingConversationId
                    ? `/app/inbox/${existingConversationId}`
                    : "#"
                }
                className={`text-sm ${
                  existingConversationId
                    ? "text-emerald-400 hover:text-emerald-300"
                    : "text-zinc-600 cursor-not-allowed"
                }`}
                aria-disabled={!existingConversationId}
              >
                Abrir inbox
              </Link>
            </div>

            <div className="px-4 py-4 text-sm text-zinc-400">
              {lastMessage ? (
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm text-zinc-300">
                      <span>💬 Último mensaje</span>
                      {lastMessage.direction === "OUTBOUND" && (
                        <span className="text-zinc-500">· Tú</span>
                      )}
                    </div>

                    <div className="mt-1 text-sm text-zinc-400 truncate">
                      {previewText(lastMessage.text)}
                    </div>
                  </div>

                  <div className="text-xs text-zinc-500 whitespace-nowrap">
                    {new Date(lastMessage.createdAt).toLocaleString("es-MX")}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-zinc-300 font-medium">
                      Sin mensajes todavía
                    </div>
                    <div className="text-zinc-500">
                      Abre el chat y envía el primer mensaje.
                    </div>
                  </div>
                  <div className="shrink-0">
                    <OpenClientChatButton
                      clientId={client.id}
                      existingConversationId={existingConversationId}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Citas */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30">
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <div className="text-sm font-medium text-zinc-200">Citas</div>
              <Link
                href={`/app/agenda?clientId=${client.id}`}
                className="text-sm text-emerald-400 hover:text-emerald-300"
              >
                Ver en agenda
              </Link>
            </div>

            {(client.appointments?.length ?? 0) === 0 ? (
              <div className="px-4 py-8 text-sm text-zinc-400">
                <div className="mb-3">Aún no hay citas. Agenda la primera.</div>
                <Link
                  href={`/app/agenda?clientId=${client.id}`}
                  className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500"
                >
                  Agendar cita
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-zinc-800">
                {(client.appointments ?? []).map((a) => (
                  <li key={a.id} className="px-4 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm text-zinc-400">
                          {appointmentLabel({
                            startsAt: a.startsAt,
                            endsAt: a.endsAt,
                          })}
                        </div>
                        <div className="mt-1 text-sm text-zinc-200 truncate">
                          {a.service ?? "Servicio"}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={statusPill(a.status)}>{a.status}</span>
                        {existingConversationId ? (
                          <Link
                            href={`/app/inbox/${existingConversationId}`}
                            className="text-sm text-zinc-300 hover:text-white"
                          >
                            Chat
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right (side) */}
        <div className="space-y-6">
          {/* Detalles */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30">
            <div className="border-b border-zinc-800 px-4 py-3 text-sm font-medium text-zinc-200">
              Detalles
            </div>

            <div className="px-4 py-4 space-y-3 text-sm">
              <div>
                <div className="text-zinc-500">Teléfono</div>
                <div className="text-zinc-200 select-text">{phoneDisplay}</div>
              </div>

              <div>
                <div className="text-zinc-500">Notas</div>
                <div className="text-zinc-300">
                  {client.notes ? client.notes : "Sin notas."}
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800">
                <div className="text-zinc-500">Creado</div>
                <div className="text-zinc-300">
                  {new Date(client.createdAt).toLocaleDateString("es-MX")}
                </div>
              </div>

              <div>
                <div className="text-zinc-500">Actualizado</div>
                <div className="text-zinc-300">
                  {new Date(client.updatedAt).toLocaleDateString("es-MX")}
                </div>
              </div>
            </div>
          </div>

          {/* Acciones rápidas (sin duplicar Chat/Agenda porque ya están arriba) */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30">
            <div className="border-b border-zinc-800 px-4 py-3 text-sm font-medium text-zinc-200">
              Acciones rápidas
            </div>

            <div className="px-4 py-3 space-y-2">
              {/* ✅ botón interactivo aislado en Client Component */}
              <CopyPhoneButton phone={client.phone} />

              <Link
                href="/app/clients"
                className="flex w-full items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
              >
                Volver
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
