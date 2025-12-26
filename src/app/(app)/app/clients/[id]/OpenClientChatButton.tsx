"use client";

import { useRouter } from "next/navigation";

export default function OpenClientChatButton({
  existingConversationId,
}: {
  existingConversationId: string | null;
}) {
  const router = useRouter();

  function onOpen() {
    if (existingConversationId) {
      router.push(`/app/inbox/${existingConversationId}`);
      return;
    }

    alert("Este cliente aún no tiene una conversación.");
  }

  return (
    <button
      onClick={onOpen}
      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500"
      title="Abrir conversación"
    >
      Chat
    </button>
  );
}
