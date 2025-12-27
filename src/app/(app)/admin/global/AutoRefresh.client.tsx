"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type RangeKey = "2h" | "24h" | "7d" | "30d";

type Payload = {
  ok: boolean;
  error?: string;

  range: RangeKey;
  nowIso: string;

  kpis: {
    webhook: {
      total: number;
      failed: number;
      failedRate: number;
      lastEventAtIso: string | null;
    };
    outbox: {
      pending: number;
      failed2h: number;
      oldestPendingAgeSec: number | null;
    };
    delivery: {
      sent: number;
      delivered: number;
      read: number;
      readRate: number;
    };
    businesses: { active: number; dead7d: number };
  };

  alerts: Array<{
    severity: "red" | "orange" | "yellow";
    code: string;
    title: string;
    detail?: string;
    businessId?: string;
    href?: string;
  }>;

  tables: {
    webhookFails: Array<{
      id: string;
      atIso: string;
      businessId: string | null;
      businessName: string | null;
      channel: string | null;
      error: string | null;
      provider: string;
      eventType: string | null;
    }>;
    outboxFails: Array<{
      id: string;
      atIso: string;
      businessId: string;
      businessName: string | null;
      to: string | null;
      error: string | null;
      conversationId: string | null;
      channel: string;
    }>;
    outboxPendingOldest: Array<{
      id: string;
      atIso: string;
      businessId: string;
      businessName: string | null;
      channel: string;
      contactKey: string;
      status: "PENDING" | "SENDING";
      attemptCount: number;
      nextAttemptAtIso: string;
      lastError: string | null;
      conversationId: string | null;
    }>;
    topBusinesses: Array<{
      businessId: string;
      businessName: string | null;
      totalMsgs: number;
      inbound: number;
      outbound: number;
      lastMsgAtIso: string | null;
      whatsappConnected: boolean;
    }>;
    riskBusinesses: Array<{
      businessId: string;
      businessName: string | null;
      failed2h: number;
      pending: number;
      lastInboundAtIso: string | null;
      href: string;
    }>;
    onboarding: {
      tokensCreated: number;
      tokensExpired: number;
      tokensUsed: number | null;
      conversionRate: number | null;
    };
    onboardingExpired: Array<{
      tokenId: string;
      businessId: string;
      businessName: string | null;
      createdAtIso: string;
      expiresAtIso: string;
    }>;
  };

  limitations?: Record<string, string>;
};

function relTime(iso: string | null) {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.max(0, Math.floor((now - t) / 1000));
  if (sec < 60) return `hace ${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

function ageMin(iso: string) {
  const t = new Date(iso).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - t) / 1000 / 60));
}

function pct(x: number) {
  if (!isFinite(x)) return "0%";
  return `${Math.round(x * 100)}%`;
}

function severityStyles(s: "red" | "orange" | "yellow") {
  switch (s) {
    case "red":
      return "border-red-500/40 bg-red-500/10 text-red-200";
    case "orange":
      return "border-orange-500/40 bg-orange-500/10 text-orange-200";
    case "yellow":
      return "border-yellow-500/40 bg-yellow-500/10 text-yellow-200";
  }
}

function copy(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

export default function AutoRefresh() {
  const [range, setRange] = useState<RangeKey>("24h");
  const [auto, setAuto] = useState(true);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<Payload | null>(null);

  const hasDataRef = useRef(false);
  useEffect(() => {
    hasDataRef.current = !!data;
  }, [data]);

  const url = useMemo(
    () => `/api/admin/global?range=${encodeURIComponent(range)}`,
    [range]
  );

  const inflightRef = useRef(false);
  const ctrlRef = useRef<AbortController | null>(null);

  async function load() {
    if (inflightRef.current) return;

    inflightRef.current = true;
    if (!hasDataRef.current) setLoading(true);
    setErr(null);

    try {
      ctrlRef.current?.abort();
      const ctrl = new AbortController();
      ctrlRef.current = ctrl;

      const res = await fetch(url, { cache: "no-store", signal: ctrl.signal });
      const json = (await res.json()) as Payload;

      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }

      setData(json);
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setErr(e?.message ?? "Error");
    } finally {
      ctrlRef.current = null;
      inflightRef.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [range]);

  useEffect(() => {
    return () => {
      ctrlRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!auto) return;
    const id = window.setInterval(() => load(), 30_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, range]);

  async function retryOutbox(id: string) {
    try {
      await fetch("/api/admin/outbox/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } finally {
      await load();
    }
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-white/70">Rango:</span>
          {(["2h", "24h", "7d", "30d"] as RangeKey[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={[
                "rounded-lg px-3 py-1.5 text-sm",
                r === range
                  ? "bg-white/15 text-white"
                  : "bg-white/5 text-white/70 hover:bg-white/10",
              ].join(" ")}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAuto((v) => !v)}
            className={[
              "rounded-lg border px-3 py-1.5 text-sm",
              auto
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
            ].join(" ")}
          >
            Auto-refresh: {auto ? "ON (30s)" : "OFF"}
          </button>
          <button
            onClick={load}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80 hover:bg-white/10"
          >
            Actualizar
          </button>
        </div>
      </div>

      {/* Body */}
      {loading && !data ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-white/70">
          Cargando panel global…
        </div>
      ) : err ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
          {err}
          <div className="mt-3 text-sm text-red-200/80">
            Si dice “Unauthorized”, revisa que exista la cookie{" "}
            <b>booking_admin=1</b>.
          </div>
        </div>
      ) : !data ? null : (
        <>
          {/* KPIs */}
          <div className="grid gap-3 md:grid-cols-4">
            <KpiCard
              title="Webhook"
              lines={[
                `Eventos: ${data.kpis.webhook.total}`,
                `Fallos: ${pct(data.kpis.webhook.failedRate)} (${
                  data.kpis.webhook.failed
                })`,
                `Último: ${relTime(data.kpis.webhook.lastEventAtIso)}`,
              ]}
            />
            <KpiCard
              title="Outbox"
              lines={[
                `Pendientes: ${data.kpis.outbox.pending}`,
                `Fallos (2h): ${data.kpis.outbox.failed2h}`,
                `Edad máx: ${
                  data.kpis.outbox.oldestPendingAgeSec == null
                    ? "—"
                    : `${Math.floor(
                        data.kpis.outbox.oldestPendingAgeSec / 60
                      )} min`
                }`,
              ]}
            />
            <KpiCard
              title="Entrega"
              lines={[
                `SENT: ${data.kpis.delivery.sent}`,
                `DELIVERED: ${data.kpis.delivery.delivered}`,
                `READ: ${data.kpis.delivery.read} (${pct(
                  data.kpis.delivery.readRate
                )})`,
              ]}
            />
            <KpiCard
              title="Negocios"
              lines={[
                `Activos: ${data.kpis.businesses.active}`,
                `Muertos (7d): ${data.kpis.businesses.dead7d}`,
              ]}
            />
          </div>

          {/* Alerts */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Alertas</h2>
              <div className="text-xs text-white/60">
                snapshot: {new Date(data.nowIso).toLocaleString()}
              </div>
            </div>

            {data.alerts.length === 0 ? (
              <div className="text-sm text-white/70">Sin alertas críticas.</div>
            ) : (
              <div className="space-y-2">
                {data.alerts.slice(0, 8).map((a, idx) => (
                  <div
                    key={`${a.code}-${idx}`}
                    className={[
                      "flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2",
                      severityStyles(a.severity),
                    ].join(" ")}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{a.title}</div>
                      {a.detail ? (
                        <div className="text-xs opacity-80">{a.detail}</div>
                      ) : null}
                    </div>
                    {a.href ? (
                      <a
                        href={a.href}
                        className="rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-xs hover:bg-white/20"
                      >
                        Ver
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tables */}
          {/* Tables */}
          <div className="grid gap-4 lg:grid-cols-2">
            <TableCard
              title="Errores recientes — Webhook (FAILED)"
              note="WebhookEvent no tiene campo error/channel en schema: solo provider/eventType."
              cols={["Hora", "Negocio", "Provider", "Tipo", "Id"]}
              rows={data.tables.webhookFails.map((r) => [
                relTime(r.atIso),
                r.businessName ?? r.businessId ?? "—",
                r.provider,
                r.eventType ?? "—",
                r.id.slice(0, 8),
              ])}
            />

            <TableCard
              title="Errores recientes — Outbox (FAILED)"
              cols={["Hora", "Negocio", "Canal", "Contacto", "Error"]}
              rows={data.tables.outboxFails.map((r) => [
                relTime(r.atIso),
                r.businessName ?? r.businessId,
                r.channel,
                r.to ?? "—",
                r.error ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      copy(r.error!);
                    }}
                    className="text-left text-xs underline hover:text-white"
                    title="Copiar error completo"
                  >
                    {r.error.slice(0, 64)}
                  </button>
                ) : (
                  "—"
                ),
              ])}
              rowKeys={data.tables.outboxFails.map((r) => r.id)}
            />
          </div>

          {/* Cola atorada */}
          <TableCard
            title="Cola atorada — Outbox (PENDING/SENDING)"
            note="Mensajes pendientes cuyo nextAttemptAt ya venció (deberían estar intentando enviar)."
            cols={[
              "Edad",
              "Negocio",
              "Canal",
              "Contacto",
              "Status",
              "Intentos",
              "Próx intento",
              "Error",
              "Acción",
            ]}
            rows={data.tables.outboxPendingOldest.map((r) => [
              `${ageMin(r.atIso)} min`,
              r.businessName ?? r.businessId,
              r.channel,
              r.contactKey,
              r.status,
              String(r.attemptCount),
              relTime(r.nextAttemptAtIso),
              (r.lastError ?? "—").slice(0, 64),
              <button
                type="button"
                key={`retry-${r.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  retryOutbox(r.id);
                }}
                className="rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-xs hover:bg-white/20"
              >
                Reintentar
              </button>,
            ])}
            rowKeys={data.tables.outboxPendingOldest.map((r) => r.id)}
            onRowClick={(i) => {
              const bizId = data.tables.outboxPendingOldest[i]?.businessId;
              if (bizId) window.location.href = `/admin/businesses/${bizId}`;
            }}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <TableCard
              title="Top negocios"
              cols={["Negocio", "Msgs", "IN", "OUT", "Último", "WA"]}
              rows={data.tables.topBusinesses.map((b) => [
                b.businessName ?? b.businessId,
                String(b.totalMsgs),
                String(b.inbound),
                String(b.outbound),
                relTime(b.lastMsgAtIso),
                b.whatsappConnected ? "Sí" : "No",
              ])}
              onRowClick={(i) => {
                const bizId = data.tables.topBusinesses[i]?.businessId;
                if (bizId) window.location.href = `/admin/businesses/${bizId}`;
              }}
            />

            <TableCard
              title="Negocios en riesgo"
              cols={[
                "Negocio",
                "Failed 2h",
                "Pendientes",
                "Último inbound",
                "Acción",
              ]}
              rows={data.tables.riskBusinesses.map((b) => [
                b.businessName ?? b.businessId,
                String(b.failed2h),
                String(b.pending),
                relTime(b.lastInboundAtIso),
                "Ver",
              ])}
              onRowClick={(i) => {
                const href = data.tables.riskBusinesses[i]?.href;
                if (href) window.location.href = href;
              }}
            />
          </div>

          {/* Onboarding */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h2 className="text-lg font-semibold">Onboarding</h2>
            <div className="mt-2 grid gap-3 md:grid-cols-4">
              <MiniStat
                label="Tokens creados"
                value={String(data.tables.onboarding.tokensCreated)}
              />
              <MiniStat
                label="Tokens expirados"
                value={String(data.tables.onboarding.tokensExpired)}
              />
              <MiniStat
                label="Tokens usados"
                value={"—"}
                hint="No medible sin usedAt"
              />
              <MiniStat
                label="Conversión"
                value={"—"}
                hint="No medible sin usedAt"
              />
            </div>

            <div className="mt-4">
              <div className="mb-2 text-sm font-medium text-white/80">
                Tokens expirados (sin uso)
              </div>
              <TableCard
                compact
                title=""
                cols={["Negocio", "Creado", "Expiró", "Id"]}
                rows={data.tables.onboardingExpired.map((t) => [
                  t.businessName ?? t.businessId,
                  relTime(t.createdAtIso),
                  relTime(t.expiresAtIso),
                  t.tokenId.slice(0, 8),
                ])}
              />
            </div>

            {data.limitations ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/60">
                <div className="font-medium text-white/70">
                  Limitaciones actuales
                </div>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {Object.values(data.limitations).map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm font-medium text-white/80">{title}</div>
      <div className="mt-2 space-y-1 text-sm text-white/70">
        {lines.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="text-xs text-white/60">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
      {hint ? <div className="mt-1 text-xs text-white/50">{hint}</div> : null}
    </div>
  );
}

function TableCard({
  title,
  cols,
  rows,
  rowKeys,
  note,
  compact,
  onRowClick,
}: {
  title: string;
  cols: string[];
  rows: Array<ReactNode[]>;
  rowKeys?: string[];
  note?: string;
  compact?: boolean;
  onRowClick?: (rowIndex: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      {title ? (
        <h3 className="text-sm font-semibold text-white/85">{title}</h3>
      ) : null}
      {note ? <div className="mt-1 text-xs text-white/50">{note}</div> : null}

      <div className={compact ? "mt-2" : "mt-3"}>
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2">
            <thead>
              <tr>
                {cols.map((c) => (
                  <th
                    key={c}
                    className="px-2 text-left text-xs font-medium text-white/50"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={cols.length}
                    className="px-2 py-3 text-sm text-white/60"
                  >
                    Sin datos.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr
                    key={rowKeys?.[i] ?? i}
                    onClick={onRowClick ? () => onRowClick(i) : undefined}
                    className={[
                      "rounded-lg bg-white/5",
                      onRowClick ? "cursor-pointer hover:bg-white/10" : "",
                    ].join(" ")}
                  >
                    {r.map((cell, j) => (
                      <td key={j} className="px-2 py-2 text-sm text-white/75">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
