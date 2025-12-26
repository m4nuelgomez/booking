"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OpenClientChatButton({
  clientId,
  existingConversationId,
  channel = "whatsapp",
}: {
  clientId: string;
  existingConversationId: string | null;
  channel?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onOpen() {
    if (loading) return;
    setError(null);

    if (existingConversationId) {
      router.push(`/app/inbox/${existingConversationId}`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/conversations/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, channel }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok || !data?.conversationId) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }

      router.push(`/app/inbox/${data.conversationId}`); // ✅ ruta correcta
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "No se pudo abrir el chat";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onOpen}
        disabled={loading}
        className="rounded-xl bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15 disabled:opacity-60"
      >
        {loading ? "Abriendo…" : "Abrir chat"}
      </button>

      {error ? <div className="text-xs text-red-400">{error}</div> : null}
    </div>
  );
}
