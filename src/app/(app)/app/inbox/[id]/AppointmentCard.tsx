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
  // ✅ Barra compacta tipo "context bar"
  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div
      className={[
        "h-12 flex items-center gap-3 rounded-2xl px-4",
        "border border-white/10",
        "bg-[#0b141a]/45",
        "supports-[backdrop-filter]:bg-[#0b141a]/35",
        "backdrop-blur-xl",
        "shadow-[0_8px_24px_rgba(0,0,0,0.35)]",
      ].join(" ")}
      style={{ WebkitBackdropFilter: "blur(18px)" }}
    >
      {children}
    </div>
  );

  if (!nextAppt) {
    return (
      <Shell>
        <div className="min-w-0 flex items-center gap-3">
          <span className="text-sm">📅</span>
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-5 truncate">
              Sin cita programada
            </div>
            <div className="text-xs text-white/55 leading-4 truncate">
              Agenda en segundos sin salir del chat
            </div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href={`/app/inbox/${conversationId}?schedule=1`}
            className="h-8 inline-flex items-center rounded-lg bg-white/10 px-3 text-sm hover:bg-white/15"
          >
            Agendar
          </Link>
        </div>
      </Shell>
    );
  }

  const when =
    fmt(nextAppt.startsAt) +
    (nextAppt.endsAt ? ` – ${fmt(nextAppt.endsAt)}` : "");
  const meta = `${when}${nextAppt.service ? ` · ${nextAppt.service}` : ""}`;

  return (
    <Shell>
      <div className="min-w-0 flex items-center gap-3">
        <span className="text-sm">📅</span>
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-5 truncate">
            Próxima cita
          </div>
          <div className="text-xs text-white/60 leading-4 truncate">{meta}</div>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Link
          href={`/app/agenda?appointmentId=${nextAppt.id}`}
          className="h-8 inline-flex items-center rounded-lg bg-white/5 px-3 text-sm hover:bg-white/10 border border-white/10"
        >
          Ver
        </Link>
        <Link
          href={`/app/inbox/${conversationId}?schedule=1&reschedule=${nextAppt.id}`}
          className="h-8 inline-flex items-center rounded-lg bg-white/10 px-3 text-sm hover:bg-white/15"
        >
          Reagendar
        </Link>
      </div>
    </Shell>
  );
}
