"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type SidebarItem = {
  id: string;
  channel: string;
  contactKey: string;
  displayName: string;
  lastAt: string;
  lastText: string;
  lastDirection: "INBOUND" | "OUTBOUND" | null;
  unreadCount: number;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();

  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return d.toLocaleDateString([], { day: "2-digit", month: "short" });
}

function initials(displayName: string, contactKey: string) {
  const name = (displayName ?? "").trim();
  if (name) {
    const parts = name.split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase()).join("");
  }
  return contactKey.slice(-2).toUpperCase();
}

export default function Sidebar({
  items,
  activeId,
}: {
  items: SidebarItem[];
  activeId: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const activeFromPath = pathname?.startsWith("/app/inbox/")
    ? pathname.split("/app/inbox/")[1]?.split("/")[0]
    : null;

  const effectiveActiveId = activeFromPath ?? activeId;

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [unreadOverride, setUnreadOverride] = useState<Record<string, number>>(
    {}
  );

  useEffect(() => {
    setUnreadOverride((prev) => {
      const next = { ...prev };
      for (const it of items) {
        if (next[it.id] == null) next[it.id] = it.unreadCount ?? 0;
      }
      return next;
    });
  }, [items]);

  // refresca lista (tu comportamiento actual)
  useEffect(() => {
    if (!pathname?.startsWith("/app/inbox")) return;

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
    };

    const t = setInterval(tick, 3500);
    return () => clearInterval(t);
  }, [router, pathname]);

  // marca como leído cuando el chat dispara evento
  useEffect(() => {
    const handler = (ev: any) => {
      const id = ev?.detail?.conversationId;
      if (!id) return;

      setUnreadOverride((prev) => ({ ...prev, [id]: 0 }));

      if (document.visibilityState === "visible") router.refresh();
    };

    window.addEventListener("booking:read", handler as any);
    return () => window.removeEventListener("booking:read", handler as any);
  }, [router]);

  // scroll al activo
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
      const a = (c.displayName ?? "").toLowerCase();
      const b = c.contactKey.toLowerCase();
      const d = (c.lastText ?? "").toLowerCase();
      return a.includes(s) || b.includes(s) || d.includes(s);
    });
  }, [items, q]);

  return (
    <div className="h-full flex flex-col bg-neutral-950 text-white">
      {/* Header (respond.io-ish) */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-white/10 bg-neutral-950">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-9 w-9 rounded-full bg-white/10 border border-white/10 grid place-items-center font-bold text-sm">
            N
          </div>
          <div className="font-semibold truncate">Chats</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="h-9 w-9 rounded-lg border border-white/10 hover:bg-white/10 transition"
            title="New chat"
            aria-label="New chat"
          >
            +
          </button>
          <button
            type="button"
            className="h-9 w-9 rounded-lg border border-white/10 hover:bg-white/10 transition"
            title="Menu"
            aria-label="Menu"
          >
            ⋯
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-3 border-b border-white/10">
        <div className="h-9 rounded-lg border border-white/10 bg-white/5 flex items-center gap-2 px-3">
          <span className="text-white/50">
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
          </span>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, contact..."
            className="w-full bg-transparent outline-none text-sm text-white placeholder:text-white/40"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-neutral-500 text-sm">
            No conversations yet.
          </div>
        ) : (
          <ul className="m-0 p-0 list-none">
            {filtered.map((c) => {
              const isActive = String(effectiveActiveId ?? "") === String(c.id);

              const preview = c.lastText ? c.lastText : "";
              const prefix =
                c.lastDirection === "OUTBOUND"
                  ? "You: "
                  : c.lastDirection === "INBOUND"
                  ? ""
                  : "";

              const effectiveUnread =
                unreadOverride[c.id] ?? c.unreadCount ?? 0;
              const showUnread = effectiveUnread > 0;

              return (
                <li key={c.id} id={`convo-${c.id}`}>
                  <Link
                    href={`/app/inbox/${c.id}`}
                    className={[
                      "block",
                      "px-3 py-3",
                      "border-b border-white/5",
                      "transition",
                      isActive ? "bg-white/10" : "hover:bg-white/5",
                    ].join(" ")}
                  >
                    <div className="flex gap-3 items-center">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-white/10 border border-white/10 grid place-items-center font-bold text-xs flex-none text-white/90">
                        {initials(c.displayName, c.contactKey)}
                      </div>

                      <div className="min-w-0 flex-1">
                        {/* Row 1: name + time */}
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-sm truncate">
                            {c.displayName || c.contactKey}
                          </div>

                          <div className="ml-auto flex items-center gap-2 flex-none">
                            <div className="text-xs text-white/45">
                              {mounted ? formatTime(c.lastAt) : ""}
                            </div>
                          </div>
                        </div>

                        {/* Row 2: preview + badge */}
                        <div className="mt-0.5 flex items-center gap-2">
                          <div
                            className={[
                              "min-w-0 flex-1 text-sm truncate",
                              showUnread
                                ? "text-white/90 font-semibold"
                                : "text-white/55",
                            ].join(" ")}
                          >
                            {prefix ? (
                              <span className="text-white/45">{prefix}</span>
                            ) : null}
                            {preview || (
                              <span className="text-white/30">—</span>
                            )}
                          </div>

                          {showUnread && (
                            <div
                              className="min-w-5 h-5 px-1.5 rounded-full bg-emerald-500 text-neutral-900 text-[11px] font-extrabold grid place-items-center flex-none"
                              aria-label={`Unread ${effectiveUnread}`}
                              title={`${effectiveUnread} unread`}
                            >
                              {effectiveUnread > 99 ? "99+" : effectiveUnread}
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
