"use client";

import { useEffect, useMemo, useState } from "react";
import { ChatButton } from "./ChatButton";

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

export default function AgendaPage() {
  const [date, setDate] = useState(() => yyyyMmDd(new Date()));
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // modal state
  const [open, setOpen] = useState(false);
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
      const data = await res.json();
      if (!res.ok || !data?.ok)
        throw new Error(data?.error ?? `HTTP ${res.status}`);
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

  const title = useMemo(() => {
    const d = new Date(`${date}T00:00:00`);
    return d.toLocaleDateString("es-MX", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [date]);

  async function createAppointment() {
    const payload = {
      phone,
      name: name.trim() || null,
      date,
      time,
      durationMin,
      service: service.trim() || null,
      notes: notes.trim() || null,
    };

    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok)
        throw new Error(data?.error ?? `HTTP ${res.status}`);

      setOpen(false);
      setPhone("");
      setName("");
      setService("");
      setNotes("");

      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Agenda</h1>
          <p className="text-sm text-zinc-400 capitalize">{title}</p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
          />
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
            disabled={loading}
          >
            Nueva cita
          </button>
        </div>
      </div>

      {err ? (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-200">
          {err}
        </div>
      ) : null}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30">
        <div className="border-b border-zinc-800 px-4 py-3 text-sm text-zinc-300">
          {loading ? "Cargando..." : `${items.length} cita(s)`}
        </div>

        {items.length === 0 && !loading ? (
          <div className="px-4 py-10 text-center text-sm text-zinc-400">
            No hay citas para este día.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {items.map((it) => {
              const s = new Date(it.startsAt);
              const e = it.endsAt ? new Date(it.endsAt) : null;
              const who = it.client?.name
                ? it.client.name
                : it.client?.phone ?? "Cliente";
              return (
                <li key={it.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm text-zinc-400">
                        {hhmm(s)}
                        {e ? ` – ${hhmm(e)}` : ""}
                      </div>
                      <div className="mt-1 text-base font-semibold">{who}</div>
                      <div className="mt-1 text-sm text-zinc-300">
                        {it.service ?? "Servicio no especificado"}
                      </div>
                      {it.notes ? (
                        <div className="mt-2 text-sm text-zinc-400">
                          {it.notes}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      <ChatButton
                        appointmentId={it.id}
                        existingConversationId={it.conversationId}
                      />

                      <div className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-300">
                        {it.status}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Nueva cita</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-1 text-zinc-400 hover:bg-zinc-900"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <label className="text-xs text-zinc-400">Teléfono *</label>
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

              <div className="grid gap-2 md:grid-cols-3">
                <div>
                  <label className="text-xs text-zinc-400">Fecha</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400">Hora *</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
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
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
                >
                  Cancelar
                </button>
                <button
                  onClick={createAppointment}
                  disabled={loading}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
                >
                  Crear
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
