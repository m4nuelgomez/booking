"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function TopbarMenu({
  dashboardHref = "/app/dashboard",
  clientsHref = "/app/clients",
  agendaHref = "/app/agenda",
  logoutEndpoint = "/api/auth/logout",
}: {
  dashboardHref?: string;
  clientsHref?: string;
  agendaHref?: string;
  logoutEndpoint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);

  function computePos() {
    const btn = btnRef.current;
    if (!btn) return;

    const r = btn.getBoundingClientRect();
    const menuW = 224; // w-56
    const gap = 8;

    const top = Math.round(r.bottom + gap);
    let left = Math.round(r.right - menuW);

    const minLeft = 8;
    const maxLeft = window.innerWidth - menuW - 8;
    left = Math.max(minLeft, Math.min(left, maxLeft));

    setPos({ top, left });
  }

  function openMenu() {
    computePos();
    setOpen(true);
  }
  function closeMenu() {
    setOpen(false);
  }

  useLayoutEffect(() => {
    if (!open) return;
    computePos();

    const onResize = () => computePos();
    const onScroll = () => computePos();

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeMenu();
    }
    function onClick(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      closeMenu();
    }

    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  function onLogout() {
    closeMenu();

    // ✅ POST real sin fetch (infalible). El server hace redirect a /login.
    const form = document.createElement("form");
    form.method = "POST";
    form.action = logoutEndpoint;
    document.body.appendChild(form);
    form.submit();
  }

  return (
    <>
      {/* Botón (⋮) */}
      <button
        ref={btnRef}
        type="button"
        onClick={open ? closeMenu : openMenu}
        className="rounded-lg px-2 py-1 text-white/80 hover:text-white hover:bg-white/10"
        aria-label="Menú"
        title="Menú"
      >
        ⋮
      </button>

      {mounted &&
        open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed z-2147483647 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#111b21] shadow-2xl"
            style={{ top: pos.top, left: pos.left }}
          >
            <Link
              href={dashboardHref}
              className="block px-4 py-3 text-sm text-white/90 hover:bg-white/10"
              onClick={closeMenu}
            >
              Inicio
            </Link>

            <Link
              href={clientsHref}
              className="block px-4 py-3 text-sm text-white/90 hover:bg-white/10"
              onClick={closeMenu}
            >
              Clientes
            </Link>

            <Link
              href={agendaHref}
              className="block px-4 py-3 text-sm text-white/90 hover:bg-white/10"
              onClick={closeMenu}
            >
              Agenda
            </Link>

            <div className="h-px bg-white/10" />

            <button
              onClick={onLogout}
              className="block w-full px-4 py-3 text-left text-sm text-white/80 hover:bg-white/10"
            >
              Cerrar sesión
            </button>
          </div>,
          document.body
        )}
    </>
  );
}
