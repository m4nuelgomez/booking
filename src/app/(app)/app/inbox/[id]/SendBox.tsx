"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function SendIcon({ disabled }: { disabled: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      className={disabled ? "opacity-40" : "opacity-90"}
    >
      <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" fill="currentColor" />
    </svg>
  );
}

export function SendBox({
  conversationId,
  disabled = false,
  disabledReason,
}: {
  conversationId: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  // autosize (1 a 5 líneas)
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;

    el.style.height = "20px";
    const max = 20 * 5;
    const next = Math.min(el.scrollHeight, max);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }, [text]);

  async function onSend() {
    if (disabled) return;

    const t = text.trim();
    if (!t || loading) return;

    setText("");
    const backup = t;

    setLoading(true);
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, text: t }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok)
        throw new Error(data?.error ?? `HTTP ${res.status}`);

      router.refresh();
      window.dispatchEvent(
        new CustomEvent("booking:messageSent", {
          detail: { conversationId },
        })
      );
    } catch (e) {
      setText(backup);
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const uiDisabled = disabled || loading;
  const sendDisabled = uiDisabled || !text.trim();

  return (
    <div className="wa-composer">
      {disabled && disabledReason ? (
        <div className="px-3 pt-2 text-xs text-amber-200/90">
          {disabledReason}
        </div>
      ) : null}

      <div className="wa-composerInner flex items-end gap-2 px-3 py-2">
        <div className="flex-1 rounded-2xl border border-white/10 bg-transparent px-3 py-2">
          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={uiDisabled}
            placeholder={
              uiDisabled ? "WhatsApp no conectado" : "Escribe un mensaje..."
            }
            rows={1}
            className={[
              "w-full bg-transparent outline-none text-[14px] resize-none leading-5 min-h-[20px] max-h-[100px]",
              uiDisabled
                ? "text-white/40 cursor-not-allowed placeholder:text-white/25"
                : "text-white placeholder:text-white/35",
            ].join(" ")}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
          />
        </div>

        <button
          onClick={onSend}
          disabled={sendDisabled}
          className={[
            "h-10 w-10 self-center rounded-lg grid place-items-center transition",
            sendDisabled
              ? "bg-white/5 text-white/30 cursor-not-allowed"
              : "bg-emerald-500/90 text-neutral-950 hover:bg-emerald-500",
          ].join(" ")}
          type="button"
          aria-label="Enviar"
          title="Enviar"
        >
          <SendIcon disabled={sendDisabled} />
        </button>
      </div>
    </div>
  );
}
