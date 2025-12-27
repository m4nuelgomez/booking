import Link from "next/link";
import { AdminLogoutButton } from "./AdminLogoutButton";

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
    >
      {label}
    </Link>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0b0f14] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b0f14]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/global"
              className="text-sm font-semibold text-white/90"
            >
              Booking Admin
            </Link>

            <div className="hidden items-center gap-2 sm:flex">
              <NavLink href="/admin/global" label="Panel global" />
              <NavLink href="/admin/businesses" label="Negocios" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AdminLogoutButton />
          </div>
        </div>

        {/* Nav móvil */}
        <div className="mx-auto flex max-w-6xl gap-2 px-6 pb-4 sm:hidden">
          <NavLink href="/admin/global" label="Panel global" />
          <NavLink href="/admin/businesses" label="Negocios" />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">{children}</main>
    </div>
  );
}
