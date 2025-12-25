import { prisma } from "@/lib/prisma";
import MessagesList from "./MessagesList";
import { SendBox } from "./SendBox";
import ScheduleModalShell from "./ScheduleModalShell";
import TopbarMenu from "./TopbarMenu";
import { requireBusinessId } from "@/lib/auth";
import ClientLinkButton from "./ClientLinkButton";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const businessId = await requireBusinessId();

  const convo = await prisma.conversation.findUnique({
    where: { id },
    select: {
      id: true,
      contactPhone: true,
      businessId: true,
      client: { select: { id: true, name: true, phone: true } }, // ✅
    },
  });

  if (!convo) {
    return (
      <div className="h-full p-6 text-white/80">Conversation not found.</div>
    );
  }

  const displayName =
    convo.client?.name?.trim() || convo.client?.phone || convo.contactPhone;

  const avatarText = (
    displayName?.trim()?.[0] ?? convo.contactPhone.slice(-2)
  ).toUpperCase();

  const messages = await prisma.message.findMany({
    where: { businessId, conversationId: id },
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
    deliveredAt: m.deliveredAt ? m.deliveredAt.toISOString() : null,
    readAt: m.readAt ? m.readAt.toISOString() : null,
  }));

  const now = new Date();

  const nextAppt = await prisma.appointment.findFirst({
    where: {
      businessId,
      conversationId: id,
      status: "SCHEDULED",
      startsAt: { gte: now },
    },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      service: true,
      notes: true,
      status: true,
    },
  });

  const nextApptDTO = nextAppt
    ? {
        ...nextAppt,
        startsAt: nextAppt.startsAt.toISOString(),
        endsAt: nextAppt.endsAt ? nextAppt.endsAt.toISOString() : null,
      }
    : null;

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      <div className="wa-topbar relative z-200 px-4 py-3 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-white/10 border border-white/10 grid place-items-center text-white font-extrabold">
          {avatarText}
        </div>

        <div className="min-w-0">
          <div className="text-[14px] font-extrabold text-white truncate">
            {displayName}
          </div>
          <div
            className="text-[12px] leading-tight truncate"
            style={{ color: "var(--wa-sub)" }}
          >
            {convo.contactPhone}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ClientLinkButton
            conversationId={convo.id}
            contactPhone={convo.contactPhone}
            initialClient={convo.client ?? null}
          />

          <TopbarMenu
            dashboardHref="/dashboard"
            logoutEndpoint="/api/auth/logout"
          />
        </div>
      </div>

      <div className="wa-chat-surface h-full min-h-0 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0">
          <MessagesList
            conversationId={convo.id}
            initialMessages={initialMessages}
            nextAppt={nextApptDTO}
          />
        </div>
      </div>

      <div className="wa-composer px-3 py-3">
        <SendBox conversationId={convo.id} toPhone={convo.contactPhone} />
      </div>

      <ScheduleModalShell conversationId={convo.id} />
    </div>
  );
}
