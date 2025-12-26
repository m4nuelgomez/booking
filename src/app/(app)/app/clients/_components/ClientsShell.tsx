"use client";

import { useMemo, useRef, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatPhoneForDisplay } from "@/lib/phone";

type ClientRow = {
  id: string;
  name: string | null;
  phone: string;
  createdAt: string | Date;
  updatedAt: string | Date;

  appointmentsCount: number;
  conversationsCount: number;

  conversationId: string | null;
  unreadCount: number;

  lastMessageAt: string | Date | null;
  lastMessageText: string;
  lastMessageDir: "INBOUND" | "OUTBOUND" | string | null;
  lastMessageCreatedAt: string | Date | null;
};

function initials(name: string | null | undefined, phone: string) {
  const n = (name ?? "").trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? "C";
    const b = parts[1]?.[0] ?? "";
    return (a + b).toUpperCase();
  }
  const digits = String(phone ?? "").replace(/[^\d]/g, "");
  return (digits.slice(-2) || "C").toUpperCase();
}

function previewText(text: string) {
  const t = String(text ?? "").trim();
  if (!t) return "";
  return t.length > 52 ? t.slice(0, 52) + "…" : t;
}

function relativeTime(dateInput: string | Date) {
  const d = new Date(dateInput);
  const ms = Date.now() - d.getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "Ahora";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days === 1) return "Ayer";
  return `${days}d`;
}

type SegmentKey = "all" | "created7d" | "inactive30d";

export default function ClientsShell({
  initialRows,
  initialQ,
  initialSegment,
  total,
}: {
  initialRows: ClientRow[];
  initialQ: string;
  initialSegment: string;
  total: number;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ ?? "");
  const [segment, setSegment] = useState<SegmentKey>(
    (initialSegment as SegmentKey) || "all"
  );
  const [rows, setRows] = useState<ClientRow[]>(initialRows);
  const [isPending, startTransition] = useTransition();

  const debounceRef = useRef<any>(null);
  const qRef = useRef(q);
  qRef.current = q;

  const segmentRef = useRef(segment);
  segmentRef.current = segment;

  function pushQuery(nextQ: string, nextSegment: SegmentKey) {
    const qs = new URLSearchParams();
    const qq = nextQ.trim();
    if (qq) qs.set("q", qq);
    if (nextSegment && nextSegment !== "all") qs.set("segment", nextSegment);

    startTransition(() => {
      router.push(`/app/clients?${qs.toString()}`);
    });
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushQuery(qRef.current, segmentRef.current);
    }, 280);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, segment]);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const inflightRef = useRef(false);

  async function refresh() {
    if (inflightRef.current) return;
    inflightRef.current = true;

    try {
      const qs = new URLSearchParams();
      const qq = qRef.current.trim();
      if (qq) qs.set("q", qq);
      const seg = segmentRef.current;
      if (seg && seg !== "all") qs.set("segment", seg);

      const res = await fetch(`/api/clients/list?${qs.toString()}`, {
        cache: "no-store",
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok && Array.isArray(data.rows)) {
        setRows(data.rows);
      }
    } finally {
      inflightRef.current = false;
    }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 2500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onSent = () => refresh();
    window.addEventListener("booking:messageSent", onSent as any);
    return () =>
      window.removeEventListener("booking:messageSent", onSent as any);
  }, []);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const now = Date.now();

  const segmentCounts = useMemo(() => {
    const created7d = rows.filter((r) => {
      const c = new Date(r.createdAt).getTime();
      return now - c <= 7 * 24 * 60 * 60 * 1000;
    }).length;

    const inactive30d = rows.filter((r) => {
      const last = r.lastMessageAt ? new Date(r.lastMessageAt).getTime() : null;
      if (!last) return true;
      return now - last > 30 * 24 * 60 * 60 * 1000;
    }).length;

    return { all: rows.length, created7d, inactive30d };
  }, [rows, now]);

  const filteredRows = useMemo(() => {
    const list = [...rows];

    if (segment === "created7d") {
      return list.filter((r) => {
        const c = new Date(r.createdAt).getTime();
        return now - c <= 7 * 24 * 60 * 60 * 1000;
      });
    }

    if (segment === "inactive30d") {
      return list.filter((r) => {
        const last = r.lastMessageAt
          ? new Date(r.lastMessageAt).getTime()
          : null;
        if (!last) return true;
        return now - last > 30 * 24 * 60 * 60 * 1000;
      });
    }

    return list;
  }, [rows, segment, now]);

  const segmentTitle =
    segment === "created7d"
      ? "Nuevos (<7 días)"
      : segment === "inactive30d"
      ? "Inactivos (<30 días)"
      : "Todos";

  return (
    <div className="h-[calc(100vh-0px)] min-h-0">
      <div className="grid h-full min-h-0 grid-cols-[260px_1fr]">
        {/* LEFT */}
        <aside className="min-h-0 border-r border-white/10 bg-black/40">
          <div className="px-4 py-4 border-b border-white/10">
            <div className="text-sm font-semibold text-white/90">
              Clientes <span className="text-white/50">{rows.length}</span>
            </div>
          </div>

          <div className="p-3">
            <div className="text-[12px] uppercase tracking-wide text-white/40 mb-2">
              Segmentos
            </div>

            <div className="space-y-1">
              <SegItem
                active={segment === "all"}
                label="Todos"
                count={segmentCounts.all}
                onClick={() => setSegment("all")}
              />
              <SegItem
                active={segment === "created7d"}
                label="Nuevos (<7 días)"
                count={segmentCounts.created7d}
                onClick={() => setSegment("created7d")}
              />
              <SegItem
                active={segment === "inactive30d"}
                label="Inactivos (<30 días)"
                count={segmentCounts.inactive30d}
                onClick={() => setSegment("inactive30d")}
              />
            </div>
          </div>
        </aside>

        {/* RIGHT */}
        <main className="min-h-0 bg-black/55">
          {/* topbar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
            <div className="text-sm font-semibold text-white/90">
              {segmentTitle}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por teléfono o nombre…"
                  className="h-9 w-[520px] max-w-[52vw] rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white/85 outline-none placeholder:text-white/35 focus:border-white/20"
                />
              </div>

              <button className="h-9 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white/80 hover:bg-white/[0.07]">
                Nuevo cliente
              </button>
            </div>
          </div>

          {/* table */}
          <div className="min-h-0 overflow-auto">
            <div className="px-4 py-3">
              <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
                {/* header row (SIN checkboxes) */}
                <div className="grid grid-cols-[1.3fr_0.9fr_1.1fr_90px] items-center gap-3 px-4 py-3 text-[12px] tracking-wide text-white/35 border-b border-white/10">
                  <div>Nombre</div>
                  <div>Teléfono</div>
                  <div>Último mensaje</div>
                  <div className="text-right">No leídos</div>
                </div>
                <ul className="divide-y divide-white/10">
                  {filteredRows.length === 0 ? (
                    <li className="grid grid-cols-[1.3fr_0.9fr_1.1fr_90px] items-center gap-3 px-4 py-3">
                      {/* Nombre (sin avatar, pero con altura equivalente) */}
                      <div className="flex items-center min-h-8">
                        <div className="text-sm text-white/45 truncate">
                          Sin resultados.
                        </div>
                      </div>

                      <div />
                      <div />
                      <div />
                    </li>
                  ) : (
                    filteredRows.map((r) => {
                      const title = r.name ?? "Cliente WhatsApp";
                      const phone = formatPhoneForDisplay(r.phone);

                      const lastText = previewText(r.lastMessageText);
                      const isOut = r.lastMessageDir === "OUTBOUND";
                      const ts = r.lastMessageCreatedAt
                        ? relativeTime(r.lastMessageCreatedAt)
                        : "";

                      const unread = Number(r.unreadCount ?? 0);

                      return (
                        <li
                          key={r.id}
                          className="grid grid-cols-[1.3fr_0.9fr_1.1fr_90px] items-center gap-3 px-4 py-3 hover:bg-white/[0.04] cursor-pointer"
                          onClick={() => router.push(`/app/clients/${r.id}`)}
                        >
                          {/* Name */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-full border border-white/10 bg-white/[0.04] grid place-items-center text-[12px] font-semibold text-white/80">
                              {initials(r.name, r.phone)}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm text-white/90">
                                {title}
                              </div>
                            </div>
                          </div>

                          {/* Phone */}
                          <div className="text-sm text-white/70">{phone}</div>

                          {/* Last message */}
                          <div className="min-w-0">
                            <div className="truncate text-sm text-white/65">
                              {lastText ? (
                                <>
                                  {isOut ? (
                                    <span className="text-white/45 mr-1">
                                      You:
                                    </span>
                                  ) : null}
                                  <span className="text-white/70">
                                    {lastText}
                                  </span>
                                </>
                              ) : (
                                <span className="text-white/35">
                                  Sin mensajes
                                </span>
                              )}
                            </div>
                            <div className="text-[12px] text-white/35">
                              {ts}
                            </div>
                          </div>

                          {/* Unread */}
                          <div className="flex items-center justify-end">
                            {unread > 0 ? (
                              <span className="min-w-7 h-6 px-2 rounded-full bg-[#00a884] text-[#0b141a] text-[12px] font-extrabold grid place-items-center border border-black/30">
                                {unread > 99 ? "99+" : unread}
                              </span>
                            ) : null}
                          </div>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* footer hint */}
          <div className="px-4 pb-4 text-[12px] text-white/30">
            Mostrando {filteredRows.length} de {rows.length}
            {isPending ? <span className="ml-2">· Actualizando…</span> : null}
          </div>
        </main>
      </div>
    </div>
  );
}

function SegItem({
  active,
  label,
  count,
  onClick,
  disabled,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm",
        disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-white/[0.04]",
        active
          ? "bg-white/[0.06] border border-white/10"
          : "border border-transparent",
      ].join(" ")}
    >
      <span className="text-white/80 truncate">{label}</span>
      <span className="text-white/45">{count}</span>
    </button>
  );
}
