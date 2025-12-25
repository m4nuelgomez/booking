"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AppointmentCard } from "./AppointmentCard";

type Msg = {
  id: string;
  direction: "INBOUND" | "OUTBOUND" | string;
  text: string | null;
  createdAt: string | Date;
  providerMessageId: string | null;
  payload?: any;
  status?: "QUEUED" | "SENT" | "DELIVERED" | "READ" | "FAILED" | string;
};

function isNearBottom(el: HTMLElement, thresholdPx = 140) {
  const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
  return distance < thresholdPx;
}

function scrollToBottom(el: HTMLElement | null, smooth = false) {
  if (!el) return;
  el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
}

function formatDayChip(dateInput: string | Date) {
  const d = new Date(dateInput);
  const now = new Date();

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const startOfThatDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const diffDays =
    (startOfToday.getTime() - startOfThatDay.getTime()) / (1000 * 60 * 60 * 24);

  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";

  return d.toLocaleDateString([], {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function TickSvg({
  variant,
}: {
  variant: "single" | "double" | "doubleBlue" | "failed";
}) {
  if (variant === "failed") {
    return (
      <span
        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-400/20 text-red-200 text-[11px] font-bold"
        title="No enviado"
      >
        !
      </span>
    );
  }

  const color =
    variant === "doubleBlue" ? "var(--wa-blue)" : "rgba(134,150,160,0.95)";

  return (
    <svg
      width="18"
      height="12"
      viewBox="0 0 18 12"
      fill="none"
      style={{ color }}
    >
      {variant === "single" ? (
        <path
          d="M6.2 9.2L2.7 5.7l-1.1 1.1 4.6 4.6L16.4 1.2 15.3.1 6.2 9.2z"
          fill="currentColor"
        />
      ) : (
        <>
          <path
            d="M6.2 9.2L2.7 5.7l-1.1 1.1 4.6 4.6L16.4 1.2 15.3.1 6.2 9.2z"
            fill="currentColor"
          />
          <path
            d="M11.0 9.2L7.5 5.7l-1.1 1.1 4.6 4.6L17.8 3.6l-1.1-1.1L11.0 9.2z"
            fill="currentColor"
          />
        </>
      )}
    </svg>
  );
}

function tickVariant(status: string | undefined) {
  if (!status) return "single" as const;
  if (status === "SENT") return "single";
  if (status === "DELIVERED") return "double";
  if (status === "READ") return "doubleBlue";
  return "single" as const;
}

export default function MessagesList({
  conversationId,
  initialMessages,
  nextAppt,
}: {
  conversationId: string;
  initialMessages: Msg[];
  nextAppt: {
    id: string;
    startsAt: string | Date;
    endsAt: string | Date | null;
    service: string | null;
    notes: string | null;
    status: string;
  } | null;
}) {
  const router = useRouter();

  const [atBottom, setAtBottom] = useState(true);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [messages, setMessages] = useState<Msg[]>(initialMessages);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const wrapRef = useRef<HTMLDivElement | null>(null);

  const isUserAtBottomRef = useRef(true);

  const lastIdRef = useRef<string | null>(initialMessages.at(-1)?.id ?? null);
  const sinceRef = useRef<string>(new Date().toISOString());

  const pendingAutoScrollRef = useRef(false);
  const lastLenRef = useRef(initialMessages.length);

  const inFlightRef = useRef(false);
  const lastRTTRef = useRef(0);

  const markReadInFlightRef = useRef(false);
  const lastMarkedReadRef = useRef<string | null>(null);

  async function markReadIfNeeded(messageId: string | null) {
    if (!messageId) return;
    if (lastMarkedReadRef.current === messageId) return;
    if (markReadInFlightRef.current) return;

    markReadInFlightRef.current = true;
    try {
      const res = await fetch(`/api/conversations/${conversationId}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastMessageId: messageId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) return;

      lastMarkedReadRef.current = messageId;

      window.dispatchEvent(
        new CustomEvent("booking:read", { detail: { conversationId } })
      );

      router.refresh();
    } finally {
      markReadInFlightRef.current = false;
    }
  }

  useEffect(() => {
    setMessages(initialMessages);
    lastIdRef.current = initialMessages.at(-1)?.id ?? null;

    sinceRef.current = new Date(0).toISOString();

    setNewMessagesCount(0);

    isUserAtBottomRef.current = true;
    lastMarkedReadRef.current = null;
    markReadInFlightRef.current = false;

    window.dispatchEvent(
      new CustomEvent("booking:read", { detail: { conversationId } })
    );

    requestAnimationFrame(() => {
      scrollToBottom(wrapRef.current);

      const el = wrapRef.current;
      if (el) {
        const near = isNearBottom(el);
        isUserAtBottomRef.current = near;
        setAtBottom(near);
      }

      markReadIfNeeded(lastIdRef.current);
    });

    setTimeout(() => {
      markReadIfNeeded(lastIdRef.current);
    }, 250);
  }, [conversationId]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const onScroll = () => {
      const near = isNearBottom(el);
      isUserAtBottomRef.current = near;
      setAtBottom(near);

      if (near) {
        markReadIfNeeded(lastIdRef.current);
        setNewMessagesCount(0);
      }
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshDebounceRef = useRef<any>(null);

  function refreshSidebarSoon() {
    if (refreshDebounceRef.current) return;
    refreshDebounceRef.current = setTimeout(() => {
      refreshDebounceRef.current = null;
      router.refresh();
    }, 600);
  }

  async function fetchNew() {
    if (!conversationId) return;

    if (inFlightRef.current) return;
    inFlightRef.current = true;

    const t0 = performance.now();
    try {
      const qs = new URLSearchParams({ conversationId });
      if (lastIdRef.current) qs.set("after", lastIdRef.current);
      qs.set("since", sinceRef.current);

      const res = await fetch(`/api/messages/list?${qs.toString()}`, {
        cache: "no-store",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) return;

      const incoming: Msg[] = data.messages ?? [];
      const updates: Msg[] = data.updates ?? [];

      const norm = (m: any) => ({
        ...m,
        createdAt: new Date(m.createdAt).toISOString(),
      });

      const incomingN: Msg[] = incoming.map(norm);
      const updatesN: Msg[] = updates.map(norm);

      if (!incomingN.length && !updatesN.length) {
        if (data?.now) sinceRef.current = data.now;
        return;
      }

      if (incomingN.length || updatesN.length) refreshSidebarSoon();

      const wasAtBottom = isUserAtBottomRef.current;

      setMessages((prev) => {
        const byId = new Map(prev.map((m) => [m.id, m] as const));

        // updates (status/palomitas)
        for (const u of updatesN) {
          const old = byId.get(u.id);
          byId.set(u.id, { ...(old ?? u), ...u });
        }

        // incoming nuevos
        for (const m of incomingN) {
          if (!byId.has(m.id)) byId.set(m.id, m);
        }

        const prevIds = new Set(prev.map((m) => m.id));
        const next = prev.map((m) => byId.get(m.id)!).filter(Boolean);

        const added = incomingN.filter((m) => !prevIds.has(m.id));
        added.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        next.push(...added);

        lastIdRef.current = next.at(-1)?.id ?? lastIdRef.current;
        return next;
      });

      if (wasAtBottom && incomingN.length) {
        pendingAutoScrollRef.current = true;
      }

      if (data?.now) sinceRef.current = data.now;

      if (wasAtBottom) {
        await markReadIfNeeded(lastIdRef.current);
        setNewMessagesCount(0);
      } else {
        if (incomingN.length) setNewMessagesCount((c) => c + incomingN.length);
      }
    } finally {
      lastRTTRef.current = performance.now() - t0;
      inFlightRef.current = false;
    }
  }

  useEffect(() => {
    let cancelled = false;
    let t: any = null;

    async function sleep(ms: number) {
      await new Promise((res) => {
        t = setTimeout(res, ms);
      });
    }

    async function loop() {
      while (!cancelled) {
        const fast = isUserAtBottomRef.current;
        const target = fast ? 450 : 1400;
        const rtt = lastRTTRef.current || 0;
        const wait = Math.max(80, target - rtt);

        await sleep(wait);
        if (cancelled) break;

        await fetchNew();
      }
    }

    loop();

    return () => {
      cancelled = true;
      if (t) clearTimeout(t);
    };
  }, [conversationId]);

  useEffect(() => {
    const handler = () => fetchNew();
    window.addEventListener("booking:messageSent", handler as any);
    return () =>
      window.removeEventListener("booking:messageSent", handler as any);
  }, [conversationId]);

  useEffect(() => {
    if (messages.length <= lastLenRef.current) return;
    lastLenRef.current = messages.length;

    if (!pendingAutoScrollRef.current) return;
    pendingAutoScrollRef.current = false;

    // post-render (robusto)
    requestAnimationFrame(() => {
      scrollToBottom(wrapRef.current, false);
      setTimeout(() => scrollToBottom(wrapRef.current, false), 0);
      setTimeout(() => scrollToBottom(wrapRef.current, false), 50);
    });
  }, [messages.length]);

  return (
    <div className="relative h-full min-h-0">
      {/* Scroll area */}
      <div
        ref={wrapRef}
        className="chatScroll h-full overflow-y-auto px-4 py-3"
        style={{ background: "var(--wa-panel)" }}
      >
        <div
          className="sticky top-0 z-10 pt-2 pb-2"
          style={{ background: "transparent" }}
        >
          <AppointmentCard
            conversationId={conversationId}
            nextAppt={nextAppt}
          />
        </div>

        <div className="h-4" />

        <div className="space-y-2">
          {messages.map((m, idx) => {
            const outbound = m.direction === "OUTBOUND";
            const failed =
              outbound &&
              (m.status === "FAILED" || m?.payload?.sendStatus === "FAILED");
            const usedTemplate = outbound && m?.payload?.usedTemplate === true;

            const prev = idx > 0 ? messages[idx - 1] : null;
            const day = new Date(m.createdAt).toDateString();
            const prevDay = prev
              ? new Date(prev.createdAt).toDateString()
              : null;
            const showDayChip = day !== prevDay;

            const text = (m.text ?? "").trim();
            const hasText = text.length > 0;

            // ✅ burbujas fantasma: si no hay contenido, no renders bubble
            // pero dejamos pasar "template" y "failed" para mostrar avisos
            if (!hasText && !usedTemplate && !failed) {
              return (
                <div key={m.id}>
                  {showDayChip && (
                    <div
                      className="mx-auto my-2 w-fit rounded-full bg-black/30 px-3 py-1 text-[11px] text-white/70 border border-white/10"
                      suppressHydrationWarning
                    >
                      {mounted ? (
                        formatDayChip(m.createdAt) === "Hoy" ? (
                          <span className="font-semibold text-white/80">
                            Hoy
                          </span>
                        ) : (
                          formatDayChip(m.createdAt)
                        )
                      ) : (
                        ""
                      )}
                    </div>
                  )}
                </div>
              );
            }

            const bubbleClass = outbound
              ? failed
                ? "ml-auto bg-red-600/90 text-white"
                : usedTemplate
                ? "ml-auto bg-yellow-400 text-black"
                : "ml-auto text-[#e9edef]"
              : "mr-auto text-[#e9edef]";

            const bubbleStyle = outbound
              ? failed || usedTemplate
                ? undefined
                : { background: "var(--wa-out)" }
              : { background: "var(--wa-in)" };

            return (
              <div key={m.id}>
                {showDayChip && (
                  <div
                    className="mx-auto my-2 w-fit rounded-full bg-black/30 px-3 py-1 text-[11px] text-white/70 border border-white/10"
                    suppressHydrationWarning
                  >
                    {mounted ? (
                      formatDayChip(m.createdAt) === "Hoy" ? (
                        <span className="font-semibold text-white/80">Hoy</span>
                      ) : (
                        formatDayChip(m.createdAt)
                      )
                    ) : (
                      ""
                    )}
                  </div>
                )}

                <div
                  className={`max-w-[72%] rounded-xl px-3 py-2 text-[13px] leading-5 shadow-sm wrap-break-word whitespace-pre-wrap ${bubbleClass}`}
                  style={bubbleStyle}
                >
                  {/* Texto */}
                  {hasText ? (
                    <div className="whitespace-pre-wrap">{text}</div>
                  ) : null}

                  {/* footer WA: hora + ticks */}
                  <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-white/60">
                    <span suppressHydrationWarning>
                      {mounted
                        ? new Date(m.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </span>

                    {outbound && (
                      <span className="ml-0.5 translate-y-px">
                        <TickSvg
                          variant={
                            failed
                              ? "failed"
                              : tickVariant(String(m.status ?? ""))
                          }
                        />
                      </span>
                    )}
                  </div>

                  {usedTemplate && !failed && (
                    <div className="mt-2 rounded-lg bg-black/10 px-2 py-1 text-[11px] opacity-90 wrap-break-word whitespace-pre-wrap">
                      Se envió plantilla para abrir conversación (no se envió tu
                      texto)
                    </div>
                  )}

                  {failed && (
                    <div className="mt-2 rounded-lg bg-black/20 px-2 py-1 text-[11px] text-white/85 wrap-break-word whitespace-pre-wrap">
                      <span className="font-semibold">No enviado.</span>{" "}
                      {String(m?.payload?.sendError ?? "Error al enviar.")}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scroll to bottom button */}
      {newMessagesCount > 0 && !atBottom && (
        <button
          onClick={() => {
            scrollToBottom(wrapRef.current, true);
            markReadIfNeeded(lastIdRef.current);
            setNewMessagesCount(0);
            setAtBottom(true);
            isUserAtBottomRef.current = true;
          }}
          className="absolute bottom-6 right-6 z-50 h-11 w-11 rounded-full bg-[#202c33] border border-white/10 shadow-lg grid place-items-center text-white/80 hover:bg-white/10"
          title={`${newMessagesCount} nuevo(s)`}
          aria-label="Scroll to bottom"
        >
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 rounded-full bg-[#00a884] text-[#111b21] text-[12px] font-extrabold grid place-items-center border border-black/30 animate-bounce-once">
            {newMessagesCount > 99 ? "99+" : newMessagesCount}
          </span>

          <span className="text-[16px]">▾</span>
        </button>
      )}
    </div>
  );
}
