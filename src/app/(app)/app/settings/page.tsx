import Link from "next/link";

function Card({
  title,
  desc,
  href,
}: {
  title: string;
  desc: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition"
    >
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-1 text-sm text-white/60">{desc}</div>
      <div className="mt-3 text-xs text-white/45">Abrir →</div>
    </Link>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Ajustes</h1>
        <p className="text-sm text-white/60">
          Configura el negocio y sus canales.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card
          title="WhatsApp"
          desc="Conecta y prueba el canal de WhatsApp."
          href="/app/settings/whatsapp"
        />

        {/* después metemos más */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 opacity-60">
          <div className="text-sm font-medium">Notificaciones</div>
          <div className="mt-1 text-sm text-white/60">Pronto.</div>
        </div>
      </div>
    </div>
  );
}
