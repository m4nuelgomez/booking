import { prisma } from "@/lib/prisma";
import Sidebar from "./Sidebar";
import SegmentsPanel from "./SegmentsPanel";
import { headers } from "next/headers";
import { requireBusinessId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = await headers();
  const url = h.get("x-url") || h.get("referer") || "";
  const match = url.match(/\/app\/inbox\/([^/?#]+)/);
  const activeId = match?.[1] ?? null;

  const businessId = await requireBusinessId();

  const conversations = await prisma.conversation.findMany({
    where: { businessId },
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
    take: 50,
    select: {
      id: true,
      channel: true,
      contactKey: true,
      contactDisplay: true,
      lastMessageAt: true,
      createdAt: true,
      unreadCount: true,
      client: {
        select: { name: true },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { direction: true, text: true, createdAt: true },
      },
    },
  });

  const items = conversations.map((c) => {
    const last = c.messages[0] ?? null;
    const lastAt = c.lastMessageAt ?? last?.createdAt ?? c.createdAt;

    const displayName =
      c.client?.name?.trim() ?? c.contactDisplay ?? c.contactKey;

    return {
      id: c.id,
      channel: c.channel,
      contactKey: c.contactKey,
      displayName,
      lastAt: lastAt.toISOString(),
      lastText: (last?.text ?? "").trim(),
      lastDirection: last?.direction ?? null,
      unreadCount: c.unreadCount ?? 0,
    };
  });

  return (
    <div className="h-full min-h-0 bg-neutral-950 overflow-hidden">
      {/* 3 columnas: Segments / Chats / Conversation */}
      <div className="h-full min-h-0 flex">
        <SegmentsPanel />

        <aside className="h-full w-[360px] border-r border-white/10 min-w-0">
          <Sidebar items={items} activeId={activeId} />
        </aside>

        <section className="flex-1 min-w-0 h-full min-h-0 overflow-hidden">
          {children}
        </section>
      </div>
    </div>
  );
}
