// src/app/inbox/[id]/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const convo = await prisma.conversation.findUnique({
    where: { id },
    select: { id: true, contactPhone: true, businessId: true },
  });

  if (!convo) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui" }}>
        <p>Conversation not found.</p>
        <Link href="/inbox">Back</Link>
      </main>
    );
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: {
      id: true,
      direction: true,
      text: true,
      createdAt: true,
      fromPhone: true,
      toPhone: true,
      providerMessageId: true,
    },
  });

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <Link href="/inbox">← Back</Link>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginTop: 12 }}>
        {convo.contactPhone}
      </h1>

      <ul style={{ marginTop: 16, display: "grid", gap: 10, padding: 0, listStyle: "none" }}>
        {messages.map((m) => (
          <li
            key={m.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 12,
              background: m.direction === "INBOUND" ? "#fff" : "#f7f7f7",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              {m.createdAt.toISOString()} · {m.direction} · {m.providerMessageId ?? "no-id"}
            </div>
            <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
              {m.text ?? "(non-text message)"}
            </div>
          </li>
        ))}
        {messages.length === 0 && <li style={{ opacity: 0.7 }}>No messages yet.</li>}
      </ul>
    </main>
  );
}