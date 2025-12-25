import Link from "next/link";

function fmt(dt: string | Date) {
  const d = new Date(dt);
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function AppointmentCard({
  conversationId,
  nextAppt,
}: {
  conversationId: string;
  nextAppt: {
    id: string;
    startsAt: string | Date;
    endsAt: string | Date | null;
    service: string | null;
    notes: string | null;
    status: string;
  } | null;
}) {
  if (!nextAppt) {
    return (
      <div className="mb-3 rounded-2xl border border-white/15 bg-black/20 p-3 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">📅 Sin cita programada</div>
            <div className="text-xs text-white/60">
              Agenda en 10 segundos sin salir del chat.
            </div>
          </div>

          <Link
            href={`/inbox/${conversationId}?schedule=1`}
            className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
          >
            Agendar ahora
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-3 rounded-2xl border border-white/15 bg-black/20 p-3 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold">📅 Próxima cita</div>
          <div className="text-xs text-white/70">
            {fmt(nextAppt.startsAt)}
            {nextAppt.endsAt ? ` – ${fmt(nextAppt.endsAt)}` : ""}
            {nextAppt.service ? ` · ${nextAppt.service}` : ""}
          </div>
          {nextAppt.notes ? (
            <div className="mt-1 truncate text-xs text-white/50">
              {nextAppt.notes}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 gap-2">
          <Link
            href={`/agenda?appointmentId=${nextAppt.id}`}
            className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
          >
            Ver
          </Link>
          <Link
            href={`/inbox/${conversationId}?schedule=1&reschedule=${nextAppt.id}`}
            className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
          >
            Reagendar
          </Link>
        </div>
      </div>
    </div>
  );
}
