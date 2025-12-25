"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Modal } from "@/components/Modal";

type Status = "SCHEDULED" | "COMPLETED" | "CANCELED" | "NO_SHOW";

type Item = {
  id: string;
  startsAt: string;
  endsAt: string | null;
  service: string | null;
  notes: string | null;
  status: Status;
  client: { id: string; name: string | null; phone: string } | null;
  conversationId: string | null;
};

type Props = {
  it: Item;
  loading?: boolean; // loading global del padre (AgendaPage)
};

function hhmm(d: Date) {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function yyyyMmDd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function statusLabel(s: Status) {
  switch (s) {
    case "SCHEDULED":
      return "Programada";
    case "COMPLETED":
      return "Completada";
    case "CANCELED":
      return "Cancelada";
    case "NO_SHOW":
      return "No asistió";
  }
}

export function AppointmentCard({ it, loading = false }: Props) {
  const router = useRouter();

  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [loadingCancel, setLoadingCancel] = useState(false);

  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [loadingReschedule, setLoadingReschedule] = useState(false);

  const [loadingChat, setLoadingChat] = useState(false);

  const [err, setErr] = useState<string | null>(null);

  const starts = useMemo(() => new Date(it.startsAt), [it.startsAt]);
  const defaultDate = useMemo(() => yyyyMmDd(starts), [starts]);
  const defaultTime = useMemo(() => hhmm(starts), [starts]);

  const defaultDuration = useMemo(() => {
    if (!it.endsAt) return 60;
    const ends = new Date(it.endsAt);
    const mins = Math.max(
      5,
      Math.round((ends.getTime() - starts.getTime()) / 60000)
    );
    return mins;
  }, [it.endsAt, starts]);

  const [newDate, setNewDate] = useState(defaultDate);
  const [newTime, setNewTime] = useState(defaultTime);
  const [durationMin, setDurationMin] = useState(defaultDuration);

  const isBusy = loading || loadingChat || loadingCancel || loadingReschedule;
  const disabledActions = it.status !== "SCHEDULED" || isBusy;

  async function cancelAppointment() {
    setLoadingCancel(true);
    setErr(null);

    try {
      const res = await fetch(`/api/appointments/${it.id}/cancel`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok)
        throw new Error(data?.error ?? `HTTP ${res.status}`);

      setConfirmCancelOpen(false);
      window.dispatchEvent(new CustomEvent("booking:appointmentsChanged"));
    } catch (e: any) {
      setErr(e?.message ?? "Error");
    } finally {
      setLoadingCancel(false);
    }
  }

  async function rescheduleAppointment() {
    setLoadingReschedule(true);
    setErr(null);

    try {
      const res = await fetch(`/api/appointments/${it.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: newDate, time: newTime, durationMin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok)
        throw new Error(data?.error ?? `HTTP ${res.status}`);

      setRescheduleOpen(false);
      window.dispatchEvent(new CustomEvent("booking:appointmentsChanged"));
    } catch (e: any) {
      setErr(e?.message ?? "Error");
    } finally {
      setLoadingReschedule(false);
    }
  }

  async function openChat() {
    setLoadingChat(true);
    setErr(null);

    try {
      const res = await fetch("/api/conversations/ensure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: it.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok)
        throw new Error(data?.error ?? `HTTP ${res.status}`);

      router.push(`/app/inbox/${data.conversationId}`);
    } catch (e: any) {
      setErr(e?.message ?? "Error");
    } finally {
      setLoadingChat(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-4">
      {err ? (
        <div className="mb-3 rounded-xl border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-200">
          {err}
        </div>
      ) : null}

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-zinc-300">
            {new Date(it.startsAt).toLocaleTimeString("es-MX", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            {it.endsAt
              ? " — " +
                new Date(it.endsAt).toLocaleTimeString("es-MX", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : ""}
          </div>

          <div className="mt-1 text-base font-semibold text-zinc-100">
            {it.client?.name ?? "Sin nombre"}
          </div>

          <div className="mt-1 text-sm text-zinc-400">{it.service ?? "—"}</div>

          {it.notes ? (
            <div className="mt-1 text-sm text-zinc-400">{it.notes}</div>
          ) : null}
        </div>

        <div className="shrink-0 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-200">
          {statusLabel(it.status)}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={openChat}
          disabled={isBusy}
          className="rounded-lg border border-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-900 disabled:opacity-50"
        >
          {loadingChat ? "Abriendo..." : "Chat"}
        </button>

        <button
          onClick={() => {
            setNewDate(defaultDate);
            setNewTime(defaultTime);
            setDurationMin(defaultDuration);
            setRescheduleOpen(true);
          }}
          disabled={disabledActions}
          className="rounded-lg border border-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-900 disabled:opacity-50"
        >
          Reagendar
        </button>

        <button
          onClick={() => setConfirmCancelOpen(true)}
          disabled={disabledActions}
          className="rounded-lg border border-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-900 disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>

      {/* Cancel confirm */}
      <ConfirmDialog
        open={confirmCancelOpen}
        title="Cancelar cita"
        description="¿Seguro que quieres cancelar esta cita? Esta acción no se puede deshacer."
        cancelText="Volver"
        confirmText="Sí, cancelar"
        variant="danger"
        loading={loadingCancel}
        onClose={() => !isBusy && setConfirmCancelOpen(false)}
        onConfirm={cancelAppointment}
      />

      {/* Reschedule modal */}
      <Modal
        open={rescheduleOpen}
        title="Reagendar cita"
        onClose={() => !isBusy && setRescheduleOpen(false)}
        footer={
          <>
            <button
              onClick={() => setRescheduleOpen(false)}
              disabled={isBusy}
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              onClick={rescheduleAppointment}
              disabled={isBusy}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              {loadingReschedule ? "Guardando..." : "Guardar"}
            </button>
          </>
        }
      >
        <div className="grid gap-3">
          <div className="grid gap-2 md:grid-cols-3">
            <div className="md:col-span-1">
              <label className="text-xs text-zinc-400">Fecha</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                disabled={isBusy}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 [color-scheme:dark] disabled:opacity-60"
              />
            </div>

            <div className="md:col-span-1">
              <label className="text-xs text-zinc-400">Hora</label>
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                disabled={isBusy}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 [color-scheme:dark] disabled:opacity-60"
              />
            </div>

            <div className="md:col-span-1">
              <label className="text-xs text-zinc-400">Duración (min)</label>
              <input
                type="number"
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                disabled={isBusy}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 disabled:opacity-60"
              />
            </div>
          </div>

          <p className="text-xs text-zinc-500">
            Nota: al reagendar se mantiene el cliente, servicio y notas.
          </p>
        </div>
      </Modal>
    </div>
  );
}
