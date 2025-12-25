"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ChatButton({
  appointmentId,
  existingConversationId,
}: {
  appointmentId: string;
  existingConversationId: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onOpen() {
    setError(null);

    if (existingConversationId) {
      router.push(`/app/inbox/${existingConversationId}`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/conversations/ensure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok || !data?.conversationId) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }

      router.push(`/app/inbox/${data.conversationId}`);
    } catch (e: any) {
      setError(e?.message ?? "No se pudo abrir el chat");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onOpen}
        disabled={loading}
        className="min-w-[86px] rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-900 disabled:opacity-50"
        title="Abrir chat"
      >
        {loading ? "Abriendo…" : "Chat"}
      </button>

      {error ? (
        <span className="text-xs text-red-300" title={error}>
          Error
        </span>
      ) : null}
    </div>
  );
}
