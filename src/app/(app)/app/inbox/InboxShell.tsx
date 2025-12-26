"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "booking_inbox_left_collapsed";

function IconHamburger() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 7h14M5 12h14M5 17h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function InboxShell({
  left,
  chats,
  children,
}: {
  left: React.ReactNode; // panel "Inbox / Segments"
  chats: React.ReactNode; // panel "Chats list" (tu Sidebar actual)
  children: React.ReactNode; // conversación
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === "1") setCollapsed(true);
    } catch {}
  }, []);

  function toggle() {
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }

  // ancho del panel izquierdo
  const leftCol = useMemo(() => (collapsed ? "64px" : "280px"), [collapsed]);

  return (
    <div
      className="h-full grid grid-cols-[var(--left)_380px_1fr] gap-0"
      style={{ ["--left" as any]: leftCol }}
    >
      {/* LEFT: Inbox+Segments */}
      <aside className="min-w-0 border-r border-white/10 bg-[#0b141a]">
        {/* Header con hamburger que colapsa TODO este panel */}
        <div className="h-14 px-3 flex items-center justify-between border-b border-white/10">
          {!collapsed ? (
            <div className="text-sm font-semibold text-white">Inbox</div>
          ) : (
            <div className="text-sm font-semibold text-white/80">I</div>
          )}

          <button
            type="button"
            onClick={toggle}
            className="h-9 w-9 grid place-items-center rounded-lg hover:bg-white/10 active:bg-white/15 transition text-white/85"
            aria-label="Toggle inbox sidebar"
            title="Toggle sidebar"
          >
            <IconHamburger />
          </button>
        </div>

        {/* Contenido: si colapsado puedes ocultar o convertir a rail */}
        <div className="h-[calc(100%-56px)]">
          {collapsed ? (
            // Rail mínimo (puedes cambiarlo a null si quieres ocultar todo)
            <div className="h-full flex flex-col items-center py-3 gap-2 text-white/70">
              {/* placeholders de íconos */}
              <div className="h-10 w-10 rounded-lg border border-white/10 grid place-items-center">
                A
              </div>
              <div className="h-10 w-10 rounded-lg border border-white/10 grid place-items-center">
                M
              </div>
              <div className="h-10 w-10 rounded-lg border border-white/10 grid place-items-center">
                U
              </div>
            </div>
          ) : (
            <div className="h-full">{left}</div>
          )}
        </div>
      </aside>

      {/* CHATS LIST */}
      <section className="min-w-0 border-r border-white/10 bg-[#111b21]">
        {chats}
      </section>

      {/* CONVERSATION */}
      <section className="min-w-0 bg-[#0b141a]">{children}</section>
    </div>
  );
}
