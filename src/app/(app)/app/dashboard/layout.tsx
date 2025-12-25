import Link from "next/link";
import { cookies } from "next/headers";

function NavItem({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const _cookieStore = await cookies();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex max-w-7xl">
        {/* Sidebar */}
        <aside className="sticky top-0 h-screen w-64 border-r border-zinc-800 p-4">
          <div className="mb-6">
            <div className="text-lg font-semibold">Booking</div>
            <div className="text-xs text-zinc-400">MVP</div>
          </div>

          <nav className="space-y-1">
            <NavItem href="/app/dashboard" label="Dashboard" icon="🏠" />
            <NavItem href="/app/inbox" label="Inbox" icon="💬" />
            <NavItem href="/app/agenda" label="Agenda" icon="📅" />
            <NavItem href="/app/clients" label="Clientes" icon="👥" />

            <div className="my-3 border-t border-zinc-800" />

            {/* Ajustes (disabled / próximamente) */}
            <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-500">
              <span className="text-base">⚙️</span>
              <span>Ajustes</span>
              <span className="ml-auto rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-400">
                Próximamente
              </span>
            </div>
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1">
          {/* Header */}
          <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <div className="text-sm text-zinc-400">Negocio</div>
                <div className="text-lg font-semibold">Demo Business</div>
              </div>

              {/* WhatsApp status placeholder */}
              <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-sm">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-zinc-200">WhatsApp</span>
                <span className="text-zinc-400">Conectado</span>
              </div>
            </div>
          </header>

          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
