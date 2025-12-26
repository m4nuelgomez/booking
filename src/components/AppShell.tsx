"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faChartLine,
  faInbox,
  faCalendarDays,
  faAddressBook,
  faGear,
  faArrowRightFromBracket,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";

type NavItem = {
  href: string;
  label: string;
  icon: any;
  disabled?: boolean;
  badge?: string;
};

const STORAGE_KEY = "booking_sidebar_collapsed";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const nav: NavItem[] = useMemo(
    () => [
      { href: "/app/dashboard", label: "Dashboard", icon: faChartLine },
      { href: "/app/inbox", label: "Inbox", icon: faInbox },
      { href: "/app/agenda", label: "Agenda", icon: faCalendarDays },
      { href: "/app/clients", label: "Clients", icon: faAddressBook },
      {
        href: "/app/settings",
        label: "Settings",
        icon: faGear,
        disabled: true,
        badge: "Soon",
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

  const title = useMemo(() => {
    if (pathname?.startsWith("/app/inbox")) return "Inbox";
    if (pathname?.startsWith("/app/agenda")) return "Agenda";
    if (pathname?.startsWith("/app/clients")) return "Clients";
    if (pathname?.startsWith("/app/settings")) return "Settings";
    return "Dashboard";
  }, [pathname]);

  // Inbox debe ser “full height” como respond.io
  const contentPadding = useMemo(() => {
    if (pathname?.startsWith("/app/inbox")) return "p-0";
    return "p-4";
  }, [pathname]);

  // Acción contextual (MVP)
  const action = useMemo(() => {
    if (pathname?.startsWith("/app/clients")) {
      return { label: "Create", icon: faPlus, href: "/app/clients?create=1" };
    }
    if (pathname?.startsWith("/app/agenda")) {
      return { label: "New", icon: faPlus, href: "/app/agenda?new=1" };
    }
    return null;
  }, [pathname]);

  return (
    <div className="h-dvh w-full bg-neutral-950 text-neutral-100">
      <div className="flex h-full">
        {/* ✅ Respond.io-like Sidebar: Rail fijo + panel expandible */}
        <div className="h-full flex">
          {/* Rail fijo */}
          <aside className="h-full w-16 border-r border-white/10 bg-neutral-950 flex flex-col">
            <div className="flex items-center justify-center h-14 border-b border-white/10">
              <button
                onClick={toggleCollapsed}
                className="h-10 w-10 rounded-lg hover:bg-white/10 transition flex items-center justify-center"
                aria-label="Toggle sidebar"
                title="Toggle"
              >
                <FontAwesomeIcon icon={faBars} />
              </button>
            </div>

            <nav className="flex-1 py-3 px-2 space-y-1">
              {nav.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname?.startsWith(item.href + "/");

                const base =
                  "h-10 w-12 rounded-lg flex items-center justify-center transition";
                const cls = item.disabled
                  ? `${base} opacity-40 cursor-not-allowed`
                  : `${base} hover:bg-white/10 ${active ? "bg-white/10" : ""}`;

                if (item.disabled) {
                  return (
                    <div
                      key={item.href}
                      className={cls}
                      title={`${item.label} (Soon)`}
                    >
                      <FontAwesomeIcon icon={item.icon} />
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cls}
                    title={item.label}
                  >
                    <FontAwesomeIcon icon={item.icon} />
                  </Link>
                );
              })}
            </nav>

            <div className="px-2 py-3 border-t border-white/10">
              <form action="/api/auth/logout" method="post">
                <button
                  className="h-10 w-12 rounded-lg hover:bg-white/10 transition flex items-center justify-center"
                  title="Logout"
                >
                  <FontAwesomeIcon icon={faArrowRightFromBracket} />
                </button>
              </form>
            </div>
          </aside>

          {/* Panel expandible */}
          {!collapsed && (
            <aside className="h-full w-64 border-r border-white/10 bg-neutral-950 flex flex-col">
              <div className="h-14 px-4 flex items-center border-b border-white/10">
                <div className="flex flex-col leading-tight">
                  <span className="font-semibold">Booking</span>
                  <span className="text-xs text-white/60">Client Panel</span>
                </div>
              </div>

              <nav className="flex-1 px-3 py-3 space-y-1">
                {nav.map((item) => {
                  const active =
                    pathname === item.href ||
                    pathname?.startsWith(item.href + "/");

                  const rowBase =
                    "flex items-center justify-between rounded-lg px-3 py-2 transition";
                  const rowCls = item.disabled
                    ? `${rowBase} opacity-50 cursor-not-allowed`
                    : `${rowBase} hover:bg-white/10 ${
                        active ? "bg-white/10" : ""
                      }`;

                  const left = (
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 flex justify-center">
                        <FontAwesomeIcon icon={item.icon} />
                      </span>
                      <span className="text-sm font-medium truncate">
                        {item.label}
                      </span>
                    </div>
                  );

                  const right = item.badge ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                      {item.badge}
                    </span>
                  ) : null;

                  if (item.disabled) {
                    return (
                      <div key={item.href} className={rowCls} title="Soon">
                        {left}
                        {right}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={rowCls}
                      title={item.label}
                    >
                      {left}
                      {right}
                    </Link>
                  );
                })}
              </nav>

              <div className="px-3 py-3 border-t border-white/10">
                <form action="/api/auth/logout" method="post">
                  <button className="w-full flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/10 transition">
                    <span className="w-6 flex justify-center">
                      <FontAwesomeIcon icon={faArrowRightFromBracket} />
                    </span>
                    <span className="text-sm">Logout</span>
                  </button>
                </form>
              </div>
            </aside>
          )}
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
