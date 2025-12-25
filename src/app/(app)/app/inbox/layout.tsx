import { prisma } from "@/lib/prisma";
import Sidebar from "./Sidebar";
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
  const match = url.match(/\/inbox\/([^/?#]+)/);
  const activeId = match?.[1] ?? null;

  const businessId = await requireBusinessId();

  const conversations = await prisma.conversation.findMany({
    where: { businessId },
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
    take: 50,
    select: {
      id: true,
      contactPhone: true,
      lastMessageAt: true,
      createdAt: true,
      unreadCount: true,
      client: {
        select: {
          name: true,
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          direction: true,
          text: true,
          createdAt: true,
        },
      },
    },
  });

  const items = conversations.map((c) => {
    const last = c.messages[0] ?? null;
    const lastAt = c.lastMessageAt ?? last?.createdAt ?? c.createdAt;

    const displayName = c.client?.name?.trim() || c.contactPhone;

    return {
      id: c.id,
      contactPhone: c.contactPhone,
      displayName,
      lastAt: lastAt.toISOString(),
      lastText: (last?.text ?? "").trim(),
      lastDirection: last?.direction ?? null,
      unreadCount: c.unreadCount ?? 0,
    };
  });

  return (
    <div className="h-screen w-full bg-[#0b141a]">
      <div className="h-full w-full wa-wallpaper">
        <div className="h-full max-w-375 mx-auto px-4 py-4">
          <div className="h-full grid grid-cols-[380px_1fr] gap-4">
            <aside className="wa-panel overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div className="text-sm font-semibold text-white">Booking</div>
              </div>

              <div className="min-h-0 flex-1">
                <Sidebar items={items} activeId={activeId} />
              </div>
            </aside>

            <section className="wa-panel overflow-hidden min-w-0">
              {children}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
