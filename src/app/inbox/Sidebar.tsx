"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type SidebarItem = {
  id: string;
  contactPhone: string;
  lastAt: string; // ISO string
  lastText: string;
  lastDirection: "INBOUND" | "OUTBOUND" | null | string;
  unreadCount: number;
};

function formatTime(iso: string) {
  // WhatsApp: si es hoy -> HH:MM, si no -> DD/MM
  const d = new Date(iso);
  const now = new Date();

  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return d.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
}

function IconNewChat() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 7v10M7 12h10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M21 12a9 9 0 1 1-9-9"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.55"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M6.5 12h11M6.5 7h11M6.5 17h11"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
        stroke="currentColor"
        strokeWidth="1.8"
        opacity="0.85"
      />
      <path
        d="M16.5 16.5 21 21"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}

export default function Sidebar({
  items,
  activeId,
}: {
  items: SidebarItem[];
  activeId: string | null;
}) {
  const pathname = usePathname();

  const activeFromPath = pathname?.startsWith("/inbox/")
    ? pathname.split("/inbox/")[1]?.split("/")[0]
    : null;

  const effectiveActiveId = activeFromPath ?? activeId;

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!effectiveActiveId) return;
    const el = document.getElementById(`convo-${effectiveActiveId}`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [effectiveActiveId]);

  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((c) => {
      const a = c.contactPhone.toLowerCase();
      const b = (c.lastText ?? "").toLowerCase();
      return a.includes(s) || b.includes(s);
    });
  }, [items, q]);

  return (
    <div className="h-full flex flex-col bg-[#111b21] text-white">
      {/* Header (WhatsApp style) */}
      <div className="h-15 px-3 flex items-center justify-between bg-[#202c33] border-b border-white/5">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar placeholder */}
          <div className="w-10 h-10 rounded-full bg-white/10 border border-white/10 grid place-items-center font-black">
            N
          </div>
          <div className="font-semibold text-[15px] truncate">Chats</div>
        </div>

        <div className="flex items-center gap-1 text-white/80">
          <button
            type="button"
            className="w-10 h-10 grid place-items-center rounded-full hover:bg-white/10 active:bg-white/15 transition"
            aria-label="New chat"
            title="New chat"
          >
            <IconNewChat />
          </button>
          <button
            type="button"
            className="w-10 h-10 grid place-items-center rounded-full hover:bg-white/10 active:bg-white/15 transition"
            aria-label="Menu"
            title="Menu"
          >
            <IconMenu />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 bg-[#111b21] border-b border-white/5">
        <div className="h-9 rounded-lg bg-[#202c33] border border-white/5 flex items-center gap-2 px-3">
          <div className="text-white/70">
            <IconSearch />
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar un chat o iniciar uno nuevo"
            className="w-full bg-transparent outline-none text-[13px] placeholder:text-white/45"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto chatScroll">
        {filtered.length === 0 ? (
          <div className="p-4 text-white/60 text-sm">No conversations yet.</div>
        ) : (
          <ul className="m-0 p-0 list-none">
            {filtered.map((c) => {
              const isActive = String(effectiveActiveId ?? "") === String(c.id);

              const preview = c.lastText ? c.lastText : "";
              const prefix =
                c.lastDirection === "OUTBOUND"
                  ? "Tú: "
                  : c.lastDirection === "INBOUND"
                  ? ""
                  : "";

              const showUnread = (c.unreadCount ?? 0) > 0;

              return (
                <li key={c.id} id={`convo-${c.id}`}>
                  <Link
                    href={`/inbox/${c.id}`}
                    className={[
                      "block no-underline text-inherit",
                      "px-3 py-2.5",
                      "border-b border-white/5",
                      "transition",
                      isActive ? "bg-[#2a3942]" : "hover:bg-[#202c33]",
                    ].join(" ")}
                  >
                    <div className="flex gap-3 items-center">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-white/10 border border-white/10 grid place-items-center font-black text-sm flex-none">
                        {c.contactPhone.slice(-2)}
                      </div>

                      <div className="min-w-0 flex-1">
                        {/* Row 1: name + time */}
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-[15px] truncate">
                            {c.contactPhone}
                          </div>

                          <div className="ml-auto flex items-center gap-2 flex-none">
                            <div className="text-[12px] text-white/55">
                              {mounted ? formatTime(c.lastAt) : ""}
                            </div>
                          </div>
                        </div>

                        {/* Row 2: preview + badge */}
                        <div className="mt-0.5 flex items-center gap-2">
                          <div
                            className={`min-w-0 flex-1 text-[13px] truncate ${
                              showUnread
                                ? "text-white/85 font-semibold"
                                : "text-white/55"
                            }`}
                          >
                            {prefix && (
                              <span className="text-white/45">{prefix}</span>
                            )}
                            {preview || (
                              <span className="text-white/35"> </span>
                            )}
                          </div>

                          {showUnread && (
                            <div
                              className="min-w-5 h-5 px-1.75 rounded-full bg-[#00a884] text-[#111b21] text-[12px] font-extrabold grid place-items-center flex-none"
                              aria-label={`Unread ${c.unreadCount}`}
                              title={`${c.unreadCount} unread`}
                            >
                              {c.unreadCount > 99 ? "99+" : c.unreadCount}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
