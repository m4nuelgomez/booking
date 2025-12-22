import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SendBox } from "./SendBox";
import { AutoScroll } from "./AutoScroll";

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
      providerMessageId: true,
    },
  });

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <AutoScroll />

      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/inbox">← Back</Link>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
            {convo.contactPhone}
          </h1>
        </div>

        {/* Messages */}
        <ul
          style={{
            marginTop: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            padding: 0,
            listStyle: "none",
            paddingBottom: 110,
          }}
        >
          {messages.map((m) => (
            <li
              key={m.id}
              style={{
                maxWidth: "70%",
                alignSelf: m.direction === "INBOUND" ? "flex-start" : "flex-end",
                borderRadius: 16,
                padding: "10px 14px",
                background: m.direction === "INBOUND" ? "#2a2a2a" : "#25D366",
                color: m.direction === "INBOUND" ? "#ffffff" : "#000000",
                boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                {m.createdAt.toISOString()} · {m.direction} ·{" "}
                {m.providerMessageId ?? "no-id"}
              </div>
              <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
                {m.text ?? "(non-text message)"}
              </div>
            </li>
          ))}

          {messages.length === 0 && (
            <li style={{ opacity: 0.7 }}>No messages yet.</li>
          )}
        </ul>
      </div>

      {/* Composer al final (sticky bottom) */}
      <SendBox conversationId={convo.id} toPhone={convo.contactPhone} />
    </main>
  );
}