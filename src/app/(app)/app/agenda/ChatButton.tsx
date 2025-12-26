"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ChatButton({
  existingConversationId,
}: {
  existingConversationId: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  function onOpen() {
    if (existingConversationId) {
      router.push(`/app/inbox/${existingConversationId}`);
      return;
    }

    setError("Este cliente aún no tiene una conversación.");
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onOpen}
        className="min-w-[86px] rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-900"
        title="Abrir chat"
      >
        Chat
      </button>

      {error ? (
        <span className="text-xs text-red-300" title={error}>
          Error
        </span>
      ) : null}
    </div>
  );
}
