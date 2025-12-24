import { prisma } from "@/lib/prisma";
import MessagesList from "./MessagesList";
import { SendBox } from "./SendBox";
import { IconMenu, IconSearch } from "./WaIcons";

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
      <div className="h-full p-6 text-white/80">Conversation not found.</div>
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
      payload: true,
      status: true,
      deliveredAt: true,
      readAt: true,
    },
  });

  const initialMessages = messages.map((m) => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
  }));

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      {/* TOPBAR (WhatsApp style) */}
      <div className="wa-topbar px-4 py-3 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-white/10 border border-white/10 grid place-items-center text-white font-extrabold">
          {convo.contactPhone.slice(-2)}
        </div>

        <div className="min-w-0">
          <div className="text-[14px] font-extrabold text-white truncate">
            {convo.contactPhone}
          </div>
          <div
            className="text-[12px] leading-tight"
            style={{ color: "var(--wa-sub)" }}
          >
            online
          </div>
        </div>

        <div className="ml-auto flex items-center">
          <button className="wa-icon-btn" aria-label="Search">
            <IconSearch size={19} />
          </button>
          <button className="wa-icon-btn" aria-label="Menu">
            <IconMenu />
          </button>
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 min-h-0 p-3">
        <div className="wa-chat-surface h-full min-h-0 overflow-hidden">
          <MessagesList
            conversationId={convo.id}
            initialMessages={initialMessages}
          />
        </div>
      </div>

      {/* COMPOSER */}
      <div className="wa-composer px-3 py-3">
        <SendBox conversationId={convo.id} toPhone={convo.contactPhone} />
      </div>
    </div>
  );
}
