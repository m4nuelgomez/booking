"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  PanelRightOpen,
  PanelRightClose,
  LayoutDashboard,
  Inbox,
  Calendar,
  Users,
  Settings,
  LogOut,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  badge?: string;
};

const STORAGE_KEY = "booking_sidebar_collapsed";

const ICON_SIZE = 18;
const ICON_STROKE = 2;

export default function AppShell({
  children,
  isAdmin,
}: {
  children: React.ReactNode;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const nav: NavItem[] = useMemo(
    () => [
      {
        href: "/app/dashboard",
        label: "Panel",
        icon: <LayoutDashboard size={ICON_SIZE} strokeWidth={ICON_STROKE} />,
      },
      {
        href: "/app/inbox",
        label: "Bandeja",
        icon: <Inbox size={ICON_SIZE} strokeWidth={ICON_STROKE} />,
      },
      {
        href: "/app/agenda",
        label: "Agenda",
        icon: <Calendar size={ICON_SIZE} strokeWidth={ICON_STROKE} />,
      },
      {
        href: "/app/clients",
        label: "Clientes",
        icon: <Users size={ICON_SIZE} strokeWidth={ICON_STROKE} />,
      },
      {
        href: "/app/settings",
        label: "Ajustes",
        icon: <Settings size={ICON_SIZE} strokeWidth={ICON_STROKE} />,
        disabled: true,
        badge: "Pronto",
      },
    ],
    []
  );

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === "1") setCollapsed(true);
    } catch {}
  }, []);

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }

  // Inbox debe ser “full height”
  const contentPadding = useMemo(() => {
    if (pathname?.startsWith("/app/inbox")) return "p-0";
    return "p-4";
  }, [pathname]);

  return (
    <div className="h-dvh w-full bg-neutral-950 text-neutral-100">
      <div className="flex h-full">
        {/* Sidebar: Rail fijo + panel expandible (unificado) */}
        <div className="h-full flex bg-neutral-950 border-r border-white/10">
          <aside
            className={[
              "h-full bg-neutral-950 flex flex-col overflow-hidden",
              "transition-[width] duration-200 ease-out",
              collapsed ? "w-16" : "w-64",
              "border-r border-white/10",
            ].join(" ")}
          >
            {/* Header */}
            <div className="h-14 px-3 flex items-center gap-3 border-b border-white/10">
              <button
                onClick={toggleCollapsed}
                className="h-10 w-10 rounded-lg hover:bg-white/10 transition flex items-center justify-center flex-none"
                aria-label={collapsed ? "Abrir panel" : "Cerrar panel"}
                title={collapsed ? "Abrir panel" : "Cerrar panel"}
              >
                {collapsed ? (
                  <PanelRightClose size={20} />
                ) : (
                  <PanelRightOpen size={20} />
                )}
              </button>

              {!collapsed && (
                <div className="font-semibold truncate">Booking</div>
              )}
            </div>

            {/* Nav */}
            <nav
              className={[
                "flex-1 py-3 space-y-1",
                collapsed ? "px-0" : "px-2",
              ].join(" ")}
            >
              {nav.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname?.startsWith(item.href + "/");

                const base = collapsed
                  ? "h-10 w-12 mx-auto rounded-lg flex items-center justify-center transition"
                  : "h-10 rounded-lg flex items-center gap-3 px-3 transition";

                const cls = item.disabled
                  ? `${base} opacity-40 cursor-not-allowed`
                  : `${base} hover:bg-white/10 ${active ? "bg-white/10" : ""}`;

                return item.disabled ? (
                  <div
                    key={item.href}
                    className={cls}
                    title={`${item.label} (${item.badge ?? "Pronto"})`}
                  >
                    <span
                      className={[
                        "grid place-items-center flex-none",
                        collapsed ? "w-full" : "w-10",
                      ].join(" ")}
                    >
                      {item.icon}
                    </span>

                    {!collapsed && (
                      <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">
                          {item.label}
                        </span>
                        {item.badge ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                            {item.badge}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cls}
                    title={item.label}
                  >
                    <span
                      className={[
                        "grid place-items-center flex-none",
                        collapsed ? "w-full" : "w-10",
                      ].join(" ")}
                    >
                      {item.icon}
                    </span>

                    {!collapsed && (
                      <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">
                          {item.label}
                        </span>
                        {item.badge ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                            {item.badge}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="px-2 py-3 border-t border-white/10 space-y-1">
              {isAdmin ? (
                // Admin: solo salir del negocio (borra booking_bid y regresa a admin/businesses)
                <form action="/api/auth/leave-business" method="post">
                  <button
                    type="submit"
                    className={[
                      "w-full h-10 rounded-lg hover:bg-white/10 transition flex items-center gap-3",
                      collapsed ? "justify-center px-0" : "px-3",
                    ].join(" ")}
                    title="Salir del negocio"
                  >
                    <span
                      className={[
                        "grid place-items-center flex-none",
                        collapsed ? "w-full" : "w-10",
                      ].join(" ")}
                    >
                      <LogOut size={18} strokeWidth={2} />
                    </span>

                    {!collapsed && (
                      <span className="text-sm">Salir del negocio</span>
                    )}
                  </button>
                </form>
              ) : (
                // Negocio: solo cerrar sesión (borra booking_gate y manda a /login)
                <form action="/api/auth/logout" method="post">
                  <button
                    type="submit"
                    className={[
                      "w-full h-10 rounded-lg hover:bg-white/10 transition flex items-center gap-3",
                      collapsed ? "justify-center px-0" : "px-3",
                    ].join(" ")}
                    title="Cerrar sesión"
                  >
                    <span
                      className={[
                        "grid place-items-center flex-none",
                        collapsed ? "w-full" : "w-10",
                      ].join(" ")}
                    >
                      <LogOut size={18} strokeWidth={2} />
                    </span>

                    {!collapsed && (
                      <span className="text-sm">Cerrar sesión</span>
                    )}
                  </button>
                </form>
              )}
            </div>
          </aside>
        </div>

        {/* Main */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Content */}
          <main className="flex-1 min-w-0 min-h-0 overflow-hidden">
            <div className={"h-full min-h-0 " + contentPadding}>{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
