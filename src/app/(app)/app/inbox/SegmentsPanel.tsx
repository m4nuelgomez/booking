"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PanelRightClose,
  PanelRightOpen,
  Search,
  Inbox,
  User,
  UserMinus,
} from "lucide-react";

const STORAGE_KEY = "booking_inbox_segments_collapsed";

type Segment = {
  key: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
};

export default function SegmentsPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState("all");

  const segments: Segment[] = useMemo(
    () => [
      {
        key: "all",
        label: "Todos",
        icon: <Inbox size={18} strokeWidth={2} />,
      },
      {
        key: "mine",
        label: "Míos",
        icon: <User size={18} strokeWidth={2} />,
      },
      {
        key: "unassigned",
        label: "Sin asignar",
        icon: <UserMinus size={18} strokeWidth={2} />,
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

  function toggle() {
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }

  return (
    <aside
      className={[
        "h-full text-white",
        "bg-neutral-950",
        "border-r border-white/10",
        collapsed ? "w-14" : "w-[280px]",
        "transition-[width] duration-200 ease-out",
        "flex flex-col overflow-hidden",
      ].join(" ")}
    >
      {/* Header (respond.io-ish) */}
      <div className="h-14 px-3 flex items-center gap-2">
        {!collapsed && (
          <div className="min-w-0">
            <div className="font-semibold text-[13px] leading-none">
              Bandeja
            </div>
          </div>
        )}

        <button
          onClick={toggle}
          className="ml-auto h-9 w-9 rounded-xl hover:bg-white/10 transition grid place-items-center text-white/80"
          aria-label="Colapsar/expandir"
          title={collapsed ? "Expandir" : "Colapsar"}
        >
          {collapsed ? (
            <PanelRightClose size={20} />
          ) : (
            <PanelRightOpen size={20} />
          )}
        </button>
      </div>

      {/* Search (solo expandido) */}
      {!collapsed && (
        <div className="px-3 pb-3">
          <div className="h-10 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 px-3">
            <Search size={16} className="text-white/55" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar"
              className="w-full bg-transparent outline-none text-[13px] text-white placeholder:text-white/40"
            />
          </div>
        </div>
      )}

      {/* Segments */}
      <div className="flex-1 overflow-y-auto py-2">
        {!collapsed && (
          <div className="px-3 pb-2 text-[11px] text-white/55">Segmentos</div>
        )}

        <div className="px-2 space-y-1">
          {segments.map((s) => {
            const isActive = active === s.key;

            if (collapsed) {
              return (
                <button
                  key={s.key}
                  onClick={() => setActive(s.key)}
                  className={[
                    "w-full h-10 rounded-xl grid place-items-center",
                    "hover:bg-white/10 transition",
                    isActive ? "bg-white/10" : "",
                  ].join(" ")}
                  title={s.label}
                >
                  <span className={isActive ? "text-white" : "text-white/80"}>
                    {s.icon}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={s.key}
                onClick={() => setActive(s.key)}
                className={[
                  "w-full flex items-center gap-3 rounded-xl px-3 py-2.5",
                  "transition",
                  isActive ? "bg-white/10" : "hover:bg-white/5",
                ].join(" ")}
              >
                <span
                  className={[
                    "w-6 grid place-items-center",
                    isActive ? "text-white" : "text-white/80",
                  ].join(" ")}
                >
                  {s.icon}
                </span>

                <span className="text-[13px] font-medium">{s.label}</span>

                {/* count (si existe) */}
                {typeof s.count === "number" ? (
                  <span className="ml-auto text-[12px] text-white/60 tabular-nums">
                    {s.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
