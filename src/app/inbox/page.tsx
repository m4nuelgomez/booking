// src/app/inbox/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function InboxPage() {
  const businessId = process.env.DEFAULT_BUSINESS_ID!;
  const conversations = await prisma.conversation.findMany({
    where: { businessId },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
    select: {
      id: true,
      contactPhone: true,
      lastMessageAt: true,
    },
  });

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Inbox</h1>
      <p style={{ opacity: 0.7 }}>Business: {businessId}</p>

      <ul style={{ marginTop: 16, display: "grid", gap: 12, padding: 0, listStyle: "none" }}>
        {conversations.map((c) => (
          <li key={c.id} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 600 }}>{c.contactPhone}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Last message: {c.lastMessageAt.toISOString()}
            </div>
            <div style={{ marginTop: 8 }}>
              <Link href={`/inbox/${c.id}`}>Open</Link>
            </div>
          </li>
        ))}
        {conversations.length === 0 && (
          <li style={{ opacity: 0.7 }}>No conversations yet.</li>
        )}
      </ul>
    </main>
  );
}