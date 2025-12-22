"use client";

import { useState } from "react";

export function SendBox({
  conversationId,
  toPhone,
}: {
  conversationId: string;
  toPhone: string;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSend() {
    const t = text.trim();
    if (!t) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          toPhone,
          text: t,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }

      setText("");
      // MVP: recarga para ver el mensaje OUTBOUND en la lista
      window.location.reload();
    } catch (e: any) {
      setError(e?.message ?? "Failed to send");
    } finally {
      setLoading(false);
    }
  }

  return (
  <div
    style={{
      position: "fixed",
      left: 0,
      right: 0,
      bottom: 20,
      zIndex: 50,
      paddingTop: 12,
      paddingBottom: 12,
      background: "rgba(0,0,0,0.85)",
      backdropFilter: "blur(8px)",
      borderTop: "1px solid rgba(255,255,255,0.08)",
      marginTop: 18,
    }}
  >
    <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gap: 8 }}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a message..."
        rows={2}
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.15)",
          background: "#141414",
          color: "#fff",
          outline: "none",
          resize: "none",
        }}
      />
      <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, opacity: 0.7 }}>To: {toPhone}</span>

        <button
          onClick={onSend}
          disabled={loading || !text.trim()}
          style={{
            padding: "10px 14px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.15)",
            cursor: loading ? "not-allowed" : "pointer",
            background: loading || !text.trim() ? "rgba(255,255,255,0.08)" : "#25D366",
            color: loading || !text.trim() ? "rgba(255,255,255,0.5)" : "#000",
            fontWeight: 700,
            minWidth: 120,
          }}
        >
          {loading ? "Sending..." : "Queue Send"}
        </button>
      </div>

      {error && <div style={{ color: "crimson", fontSize: 12 }}>{error}</div>}
    </div>
  </div>
);
}