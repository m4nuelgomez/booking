"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
  toPhone,
}: {
  conversationId: string;
  toPhone: string;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSend() {
    const t = text.trim();
    if (!t || loading) return;

    // UX: limpia inmediato
    setText("");
    const backup = t;

    setLoading(true);
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, toPhone, text: t }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok)
        throw new Error(data?.error ?? `HTTP ${res.status}`);

      // refresca sidebar + pinta mensaje local via event (lo que ya traes)
      router.refresh();
      window.dispatchEvent(new Event("booking:messageSent"));
    } catch (e) {
      // si falla, regresa texto
      setText(backup);
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const disabled = loading || !text.trim();

  return (
    <div className="flex items-end gap-2">
      {/* input */}
      <div className="flex-1 rounded-full bg-[#111b21] border border-white/10 px-4 py-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe un mensaje"
          rows={1}
          className="w-full resize-none bg-transparent outline-none text-[14px] text-white placeholder:text-white/40 leading-5"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
        />
      </div>

      {/* send */}
      <button
        onClick={onSend}
        disabled={disabled}
        className={`h-10 w-10 rounded-full grid place-items-center ${
          disabled ? "bg-white/10 text-white/40" : "bg-[#25d366] text-black"
        }`}
        type="button"
        aria-label="Send"
      >
        <SendIcon disabled={disabled} />
      </button>
    </div>
  );
}
