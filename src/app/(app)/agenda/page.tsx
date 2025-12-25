// src/app/(app)/agenda/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppointmentCard } from "./AppointmentCard";

type Item = {
  id: string;
  startsAt: string;
  endsAt: string | null;
  service: string | null;
  notes: string | null;
  status: "SCHEDULED" | "COMPLETED" | "CANCELED" | "NO_SHOW";
  client: { id: string; name: string | null; phone: string } | null;
  conversationId: string | null;
};

function yyyyMmDd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function hhmm(d: Date) {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}
function addDays(dateStr: string, delta: number) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return yyyyMmDd(d);
}
function formatShortEs(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  const s = d.toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const pretty = s.replace(",", " · ");
  return pretty.charAt(0).toUpperCase() + pretty.slice(1);
}
function todayLabel(dateStr: string) {
  const today = yyyyMmDd(new Date());
  if (dateStr === today) return "Hoy";

  const d = new Date(`${dateStr}T00:00:00`);
  const s = d.toLocaleDateString("es-MX", { weekday: "short", day: "numeric" });
  const clean = s.replace(".", "");
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function diffMinutes(a: Date, b: Date) {
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 60000));
}

export default function AgendaPage() {
  const [date, setDate] = useState(() => yyyyMmDd(new Date()));
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // modal state
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");

  const [time, setTime] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    return hhmm(d);
  });

  const [durationMin, setDurationMin] = useState(60);
  const [service, setService] = useState("");
  const [notes, setNotes] = useState("");

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/appointments?date=${encodeURIComponent(date)}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      setItems(data.items ?? []);
    } catch (e: any) {
      setErr(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const title = useMemo(() => formatShortEs(date), [date]);

  const centerLabel = useMemo(() => todayLabel(date), [date]);
  const prevDate = useMemo(() => addDays(date, -1), [date]);
  const nextDate = useMemo(() => addDays(date, 1), [date]);

  function closeModal() {
    setOpen(false);
    setEditing(null);
  }

  function resetCreateFields() {
    setPhone("");
    setName("");
    setService("");
    setNotes("");
  }

  async function saveAppointment() {
    setLoading(true);
    setErr(null);

    try {
      if (editing) {
        // ✅ Reagendar/editar
        const res = await fetch(`/api/appointments/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date,
            time,
            durationMin,
            service: service.trim() || null,
            notes: notes.trim() || null,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok) {
          throw new Error(data?.error ?? `HTTP ${res.status}`);
        }
      } else {
        // ✅ Crear
        const payload = {
          phone,
          name: name.trim() || null,
          date,
          time,
          durationMin,
          service: service.trim() || null,
          notes: notes.trim() || null,
        };

        const res = await fetch("/api/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok) {
          throw new Error(data?.error ?? `HTTP ${res.status}`);
        }
        resetCreateFields();
      }

      closeModal();
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  async function onCancel(it: Item) {
    if (it.status === "CANCELED") return;
    if (!confirm("¿Cancelar esta cita?")) return;

    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/appointments/${it.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }

      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  function onReschedule(it: Item) {
    setEditing(it);

    const s = new Date(it.startsAt);
    const e = it.endsAt ? new Date(it.endsAt) : null;

    setDate(yyyyMmDd(s)); // mueve el día seleccionado
    setTime(hhmm(s));
    setDurationMin(e ? diffMinutes(s, e) : 60);
    setService(it.service ?? "");
    setNotes(it.notes ?? "");

    setOpen(true);
  }

  return (
    <div className="space-y-5">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 border-b border-zinc-800 bg-black/60 backdrop-blur">
        <div className="mx-auto w-full max-w-6xl px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
              <p className="mt-1 text-sm text-zinc-400">{title}</p>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900">
                <span className="sr-only">Seleccionar fecha</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-transparent text-sm text-zinc-200 outline-none [color-scheme:dark]"
                />
              </label>

              <button
                onClick={() => {
                  setEditing(null);
                  // defaults razonables para nueva cita
                  const d = new Date();
                  d.setMinutes(0, 0, 0);
                  setTime(hhmm(d));
                  setDurationMin(60);
                  setService("");
                  setNotes("");
                  setOpen(true);
                }}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
                disabled={loading}
              >
                Nueva cita
              </button>
            </div>
          </div>

          {/* Actions Row */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
            >
              <span aria-hidden>←</span>
              Dashboard
            </Link>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setDate(prevDate)}
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
                title="Día anterior"
                aria-label="Día anterior"
                disabled={loading}
              >
                ←
              </button>

              <button
                onClick={() => setDate(yyyyMmDd(new Date()))}
                className={[
                  "rounded-lg border px-3 py-2 text-sm",
                  date === yyyyMmDd(new Date())
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                    : "border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-900",
                ].join(" ")}
                title="Ir a hoy"
                disabled={loading}
              >
                {centerLabel}
              </button>

              <button
                onClick={() => setDate(nextDate)}
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
                title="Día siguiente"
                aria-label="Día siguiente"
                disabled={loading}
              >
                →
              </button>
            </div>

            <p className="text-xs text-zinc-500">
              Tip: usa ← / → para moverte por días
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto w-full max-w-6xl space-y-5 px-6 py-5">
        {err ? (
          <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-200">
            {err}
          </div>
        ) : null}

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 text-sm text-zinc-300">
            <div>{loading ? "Cargando..." : `${items.length} cita(s)`}</div>
            <div className="text-zinc-500">
              {loading ? "" : "Todas las horas en tu zona"}
            </div>
          </div>

          {items.length === 0 && !loading ? (
            <div className="px-4 py-10 text-center">
              <div className="text-2xl">📭</div>
              <div className="mt-2 text-sm font-medium text-zinc-200">
                No tienes citas para este día
              </div>
              <div className="mt-1 text-sm text-zinc-400">
                Cuando un cliente agende, sus citas aparecerán aquí.
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-800">
              {items.map((it) => (
                <li key={it.id} className="px-4 py-5">
                  <AppointmentCard it={it} loading={loading} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Modal */}
        {open ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {editing ? "Reagendar cita" : "Nueva cita"}
                </h2>
                <button
                  onClick={closeModal}
                  className="rounded-lg px-2 py-1 text-zinc-400 hover:bg-zinc-900"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                {!editing ? (
                  <div className="grid gap-2 md:grid-cols-2">
                    <div>
                      <label className="text-xs text-zinc-400">
                        Teléfono *
                      </label>
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+52..."
                        className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400">Nombre</label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Opcional"
                        className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-3 text-sm text-zinc-300">
                    Reagendando cita de{" "}
                    <span className="font-semibold">
                      {editing.client?.name ??
                        editing.client?.phone ??
                        "Cliente"}
                    </span>
                  </div>
                )}

                <div className="grid gap-2 md:grid-cols-3">
                  <div>
                    <label className="text-xs text-zinc-400">Fecha</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400">Hora *</label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400">
                      Duración (min)
                    </label>
                    <input
                      type="number"
                      value={durationMin}
                      onChange={(e) => setDurationMin(Number(e.target.value))}
                      className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-400">Servicio</label>
                  <input
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    placeholder="Corte, barba, tinte..."
                    className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400">Notas</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Detalles extra"
                    className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
                  />
                </div>

                <div className="mt-2 flex justify-end gap-2">
                  <button
                    onClick={closeModal}
                    className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveAppointment}
                    disabled={loading}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
                  >
                    {editing ? "Guardar" : "Crear"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
