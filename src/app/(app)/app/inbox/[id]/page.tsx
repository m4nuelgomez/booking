import { prisma } from "@/lib/prisma";
import MessagesList from "./MessagesList";
import { SendBox } from "./SendBox";
import ScheduleModalShell from "./ScheduleModalShell";
import TopbarMenu from "./TopbarMenu";
import { requireBusinessId } from "@/lib/auth";
import ClientLinkButton from "./ClientLinkButton";
import { formatPhoneForDisplay } from "@/lib/phone";

function labelCanal(channel: string) {
  switch (channel) {
    case "whatsapp":
      return "WhatsApp";
    case "instagram":
      return "Instagram";
    case "email":
      return "Correo";
    case "tiktok":
      return "TikTok";
    default:
      return channel
        ? channel.charAt(0).toUpperCase() + channel.slice(1)
        : "Canal";
  }
}

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
      businessId: true,
      channel: true,
      contactKey: true,
      contactDisplay: true,
      client: { select: { id: true, name: true, phone: true } },
    },
  });

  if (!convo) {
    return (
      <div className="h-full p-6 text-white/80">
        Conversación no encontrada.
      </div>
    );
  }

  const displayName =
    convo.client?.name?.trim() ||
    convo.contactDisplay ||
    convo.contactKey ||
    "Cliente";

  const safeKey = convo.contactKey || "";
  const avatarText = (
    displayName?.trim()?.[0] ?? (safeKey.length >= 2 ? safeKey.slice(-2) : "CL")
  ).toUpperCase();

  const metaRight =
    convo.channel === "whatsapp"
      ? formatPhoneForDisplay(convo.contactKey)
      : convo.contactDisplay || convo.contactKey || "";

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

  type WhatsAppConfig = {
    accessToken?: string;
  };

  let canSend = true;
  let disabledReason: string | null = null;

  if (convo.channel !== "whatsapp") {
    canSend = false;
    disabledReason = "Por ahora solo puedes enviar mensajes desde WhatsApp.";
  } else {
    const wa = await prisma.channelAccount.findFirst({
      where: { businessId, channel: "whatsapp" },
      orderBy: { createdAt: "desc" },
      select: { isActive: true, config: true },
    });

    const waCfg = (wa?.config ?? null) as WhatsAppConfig | null;

    if (!wa?.isActive) {
      canSend = false;
      disabledReason =
        "WhatsApp no está conectado. Ve a Configuración → WhatsApp.";
    } else if (!waCfg?.accessToken) {
      canSend = false;
      disabledReason =
        "WhatsApp está conectado, pero falta el accessToken. Ve a Configuración → WhatsApp.";
    }
  }

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      <div className="wa-topbar sticky top-0 z-30 h-16 px-4 flex items-center gap-3 border-b border-white/10 bg-[#111b21]/80 backdrop-blur">
        {/* Avatar */}
        <div className="h-10 w-10 rounded-full bg-white/10 border border-white/10 grid place-items-center text-white font-bold text-sm">
          {avatarText}
        </div>

        {/* Name + meta */}
        <div className="min-w-0 leading-tight">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-white">
            {convo.channel === "whatsapp" ? (
              <svg
                className="h-3.5 w-3.5 shrink-0 text-emerald-400/90 translate-y-[1px]"
                viewBox="0 0 32 32"
                fill="currentColor"
                aria-hidden
              >
                <title>WhatsApp</title>
                <path d="M16.003 3C9.384 3 4 8.383 4 15.003c0 2.65.87 5.105 2.34 7.084L5 29l7.122-1.313A11.93 11.93 0 0016.003 27C22.622 27 28 21.62 28 15.003 28 8.383 22.622 3 16.003 3zm0 21.82a9.8 9.8 0 01-4.995-1.36l-.358-.214-4.228.78.804-4.123-.232-.38A9.79 9.79 0 016.2 15.003c0-5.394 4.409-9.8 9.803-9.8 5.395 0 9.797 4.406 9.797 9.8 0 5.39-4.402 9.817-9.797 9.817zm5.523-7.37c-.303-.152-1.795-.885-2.073-.986-.277-.101-.479-.152-.682.152-.203.304-.785.986-.963 1.19-.178.203-.356.228-.66.076-.303-.152-1.28-.47-2.44-1.497-.902-.804-1.51-1.798-1.687-2.102-.178-.304-.019-.469.133-.621.137-.136.304-.355.456-.533.152-.178.203-.304.304-.507.101-.203.05-.38-.025-.533-.076-.152-.682-1.646-.935-2.256-.247-.594-.498-.514-.682-.523l-.582-.01c-.203 0-.533.076-.81.38-.278.304-1.064 1.04-1.064 2.533 0 1.494 1.09 2.94 1.24 3.143.152.203 2.145 3.276 5.195 4.596.726.313 1.292.5 1.733.64.728.231 1.39.198 1.915.12.584-.087 1.795-.733 2.05-1.44.253-.707.253-1.313.177-1.44-.076-.127-.278-.203-.582-.355z" />
              </svg>
            ) : null}

            <span className="truncate">{displayName}</span>
          </div>

          <div className="mt-1 truncate text-[12px] text-white/55">
            <span>{labelCanal(convo.channel)}</span>
            {metaRight ? (
              <>
                <span className="mx-2 text-white/25">•</span>
                <span className="truncate">{metaRight}</span>
              </>
            ) : null}
          </div>
        </div>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-2">
          <ClientLinkButton
            conversationId={convo.id}
            channel={convo.channel}
            contactKey={convo.contactKey}
            contactDisplay={convo.contactDisplay}
            initialClient={convo.client ?? null}
          />

          <TopbarMenu
            dashboardHref="/app/dashboard"
            clientsHref="/app/clients"
            agendaHref="/app/agenda"
            logoutEndpoint="/api/auth/logout"
          />
        </div>
      </div>

      <div className="wa-chat-surface relative flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* wallpaper sutil */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.9]">
          <div className="absolute inset-0 bg-[#0b141a]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(16,185,129,0.05),transparent_60%)]" />
        </div>

        <div className="relative flex flex-col flex-1 min-h-0">
          {!canSend && disabledReason ? (
            <div className="shrink-0 px-4 pt-3">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                {disabledReason}
              </div>
            </div>
          ) : null}

          <MessagesList
            conversationId={convo.id}
            initialMessages={initialMessages}
            nextAppt={nextApptDTO}
          />
        </div>
      </div>

      <div className="wa-composer">
        <SendBox
          conversationId={convo.id}
          disabled={!canSend}
          disabledReason={disabledReason ?? undefined}
        />
      </div>

      <ScheduleModalShell conversationId={convo.id} />
    </div>
  );
}
