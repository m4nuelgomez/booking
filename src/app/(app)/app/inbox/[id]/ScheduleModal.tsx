"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function addMinutes(d: Date, minutes: number) {
  return new Date(d.getTime() + minutes * 60_000);
}

export default function ScheduleModal({
  conversationId,
}: {
  conversationId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const isOpen = sp.get("schedule") === "1";
  const rescheduleId = sp.get("reschedule");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultStart = useMemo(() => {
    const d = new Date();
    d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5);
    d.setSeconds(0);
    d.setMilliseconds(0);
    return d;
  }, []);

  const [startsAtLocal, setStartsAtLocal] = useState(
    toLocalInputValue(defaultStart)
  );
  const [durationMin, setDurationMin] = useState(30);
  const [service, setService] = useState("");
  const [notes, setNotes] = useState("");

  // reset when opening
  useEffect(() => {
    if (!isOpen) return;
    setLoading(false);
    setError(null);
    setStartsAtLocal(toLocalInputValue(defaultStart));
    setDurationMin(30);
    setService("");
    setNotes("");
  }, [isOpen, defaultStart]);

  function close() {
    const next = new URLSearchParams(sp.toString());
    next.delete("schedule");
    next.delete("reschedule");
    router.replace(`${pathname}?${next.toString()}`);
  }

  async function onSave() {
    setLoading(true);
    setError(null);

    try {
      const startsAt = new Date(startsAtLocal);
      if (Number.isNaN(startsAt.getTime())) {
        throw new Error("Fecha/hora inválida.");
      }

      const endsAt = addMinutes(startsAt, durationMin);

      const res = await fetch("/api/appointments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          service: service.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }

      router.refresh();
      close();
    } catch (e: any) {
      setError(e?.message ?? "Error al agendar.");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111] p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-extrabold text-white">
            {rescheduleId ? "Reagendar cita" : "Agendar cita"}
          </div>
          <button
            onClick={close}
            className="rounded-lg px-2 py-1 text-sm text-white/70 hover:bg-white/10"
          >
            Cerrar
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <div className="mb-1 text-xs text-white/70">Fecha y hora</div>
            <input
              type="datetime-local"
              value={startsAtLocal}
              onChange={(e) => setStartsAtLocal(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
            />
          </label>

          <label className="block">
            <div className="mb-1 text-xs text-white/70">Duración</div>
            <select
              value={durationMin}
              onChange={(e) => setDurationMin(Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
            >
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>60 min</option>
              <option value={90}>90 min</option>
              <option value={120}>120 min</option>
            </select>
          </label>

          <label className="block">
            <div className="mb-1 text-xs text-white/70">
              Servicio (opcional)
            </div>
            <input
              value={service}
              onChange={(e) => setService(e.target.value)}
              placeholder="Corte, barba, ceja…"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
            />
          </label>

          <label className="block">
            <div className="mb-1 text-xs text-white/70">Notas (opcional)</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: llega 10 min tarde, pago en efectivo…"
              className="min-h-20 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
            />
          </label>

          {error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={close}
              className="rounded-xl bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              onClick={onSave}
              className="rounded-xl bg-white/20 px-3 py-2 text-sm text-white hover:bg-white/25 disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
