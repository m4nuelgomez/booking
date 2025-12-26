"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "booking_inbox_segments_collapsed";

function IconBars() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 7h12M6 12h12M6 17h12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconAll() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 7h10M7 12h10M7 17h10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}

function IconMine() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 12a4 4 0 1 0-0.001-8.001A4 4 0 0 0 12 12Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M4 20c1.6-3.8 5-6 8-6s6.4 2.2 8 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}

function IconUnassigned() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2 20 6v6c0 5-3.2 8.4-8 10-4.8-1.6-8-5-8-10V6l8-4Z"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.9"
      />
      <path
        d="M8.5 12h7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconSearch() {
  // ✅ Cambiamos “la lupa” por una más clean (puedes sustituir por FontAwesome si quieres)
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.85"
      />
      <path
        d="M16.5 16.5 21 21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}

type Segment = {
  key: string;
  label: string;
  icon: React.ReactNode;
};

export default function SegmentsPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState("all");

  const segments: Segment[] = useMemo(
    () => [
      { key: "all", label: "All", icon: <IconAll /> },
      { key: "mine", label: "Mine", icon: <IconMine /> },
      { key: "unassigned", label: "Unassigned", icon: <IconUnassigned /> },
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
        "h-full border-r border-white/10 bg-[#0b141a] text-white",
        collapsed ? "w-14" : "w-[280px]",
        "transition-[width] duration-200 ease-out",
        "flex flex-col overflow-hidden",
      ].join(" ")}
    >
      {/* Header: Inbox + hamburger */}
      <div className="h-14 px-3 flex items-center gap-2 border-b border-white/10">
        <button
          onClick={toggle}
          className="h-9 w-9 rounded-lg hover:bg-white/10 transition grid place-items-center"
          aria-label="Toggle segments"
          title="Toggle"
        >
          <IconBars />
        </button>

        {!collapsed && (
          <div className="min-w-0">
            <div className="font-semibold text-[13px]">Inbox</div>
            <div className="text-[11px] text-white/55 truncate">Segments</div>
          </div>
        )}
      </div>

      {/* Search (solo cuando expandido) */}
      {!collapsed && (
        <div className="px-3 py-3 border-b border-white/10">
          <div className="h-9 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2 px-3">
            <span className="text-white/60">
              <IconSearch />
            </span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search"
              className="w-full bg-transparent outline-none text-[13px] placeholder:text-white/40"
            />
          </div>
        </div>
      )}

      {/* Segments */}
      <div className="flex-1 overflow-y-auto py-2">
        {!collapsed && (
          <div className="px-3 pb-2 text-[11px] text-white/55">Segments</div>
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
                    "w-full h-10 rounded-lg grid place-items-center",
                    "hover:bg-white/10 transition",
                    isActive ? "bg-white/10" : "",
                  ].join(" ")}
                  title={s.label}
                >
                  {s.icon}
                </button>
              );
            }

            return (
              <button
                key={s.key}
                onClick={() => setActive(s.key)}
                className={[
                  "w-full flex items-center gap-3 rounded-lg px-3 py-2",
                  "hover:bg-white/10 transition",
                  isActive ? "bg-white/10" : "",
                ].join(" ")}
              >
                <span className="w-6 grid place-items-center">{s.icon}</span>
                <span className="text-sm font-medium">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
