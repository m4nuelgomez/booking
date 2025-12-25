"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OpenClientChatButton({
  clientId,
  existingConversationId,
}: {
  clientId: string;
  existingConversationId: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onOpen() {
    if (existingConversationId) {
      router.push(`/inbox/${existingConversationId}`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/conversations/ensure-from-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok || !data?.conversationId) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }

      router.push(`/inbox/${data.conversationId}`);
    } catch (e: any) {
      alert(e?.message ?? "Failed to open chat");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={onOpen}
      disabled={loading}
      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-50"
      title="Abrir conversación"
    >
      {loading ? "Abriendo..." : "Abrir conversación"}
    </button>
  );
}
