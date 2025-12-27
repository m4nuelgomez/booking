import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CACHE_TTL_MS = 15_000;

type CacheEntry = {
  at: number;
  value: any;
};

const globalCache: Map<string, CacheEntry> =
  (globalThis as any).__booking_admin_global_cache ??
  new Map<string, CacheEntry>();

(globalThis as any).__booking_admin_global_cache = globalCache;

function getCache(key: string) {
  const hit = globalCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    globalCache.delete(key);
    return null;
  }
  return hit.value;
}

function setCache(key: string, value: any) {
  globalCache.set(key, { at: Date.now(), value });
}

type RangeKey = "2h" | "24h" | "7d" | "30d";

function rangeToMs(r: RangeKey) {
  switch (r) {
    case "2h":
      return 2 * 60 * 60 * 1000;
    case "24h":
      return 24 * 60 * 60 * 1000;
    case "7d":
      return 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return 30 * 24 * 60 * 60 * 1000;
  }
}

function clampRange(input: string | null): RangeKey {
  if (input === "2h" || input === "24h" || input === "7d" || input === "30d") {
    return input;
  }
  return "24h";
}

function fmtIso(d: Date | null | undefined) {
  return d ? d.toISOString() : null;
}

function secondsBetween(now: Date, then: Date) {
  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / 1000));
}

// ✅ EXACTO a tu login: booking_admin="1"
function isAdmin(req: NextRequest) {
  return req.cookies.get("booking_admin")?.value === "1";
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const now = new Date();
  const range = clampRange(req.nextUrl.searchParams.get("range"));
  const rangeStart = new Date(now.getTime() - rangeToMs(range));
  const start2h = new Date(now.getTime() - rangeToMs("2h"));
  const start7d = new Date(now.getTime() - rangeToMs("7d"));

  const cacheKey = `admin-global:range:${range}`;
  const cached = getCache(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  // ========= Webhook health =========
  const [webhookTotal, webhookFailed, webhookLast] = await Promise.all([
    prisma.webhookEvent.count({ where: { receivedAt: { gte: rangeStart } } }),
    prisma.webhookEvent.count({
      where: { receivedAt: { gte: rangeStart }, status: "FAILED" },
    }),
    prisma.webhookEvent.findFirst({
      orderBy: { receivedAt: "desc" },
      select: { receivedAt: true },
    }),
  ]);

  const [webhookTotal2h, webhookFailed2h] = await Promise.all([
    prisma.webhookEvent.count({ where: { receivedAt: { gte: start2h } } }),
    prisma.webhookEvent.count({
      where: { receivedAt: { gte: start2h }, status: "FAILED" },
    }),
  ]);

  // ========= Outbox health =========
  const [outboxPending, outboxFailed2h, outboxOldestPending] =
    await Promise.all([
      prisma.outboxMessage.count({
        where: { status: { in: ["PENDING", "SENDING"] } },
      }),
      prisma.outboxMessage.count({
        where: { createdAt: { gte: start2h }, status: "FAILED" },
      }),
      prisma.outboxMessage.findFirst({
        where: { status: { in: ["PENDING", "SENDING"] } },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
    ]);

  const oldestPendingAgeSec = outboxOldestPending
    ? secondsBetween(now, outboxOldestPending.createdAt)
    : null;

  const outboxPendingOldestRaw = await prisma.outboxMessage.findMany({
    where: {
      status: { in: ["PENDING", "SENDING"] },
      nextAttemptAt: { lte: now },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
    select: {
      id: true,
      businessId: true,
      channel: true,
      contactKey: true,
      status: true,
      attemptCount: true,
      nextAttemptAt: true,
      createdAt: true,
      lastError: true,
      conversationId: true,
    },
  });

  // ========= Delivery stats (OUTBOUND) =========
  const [sent, delivered, read] = await Promise.all([
    prisma.message.count({
      where: {
        createdAt: { gte: rangeStart },
        direction: "OUTBOUND",
        status: "SENT",
      },
    }),
    prisma.message.count({
      where: {
        createdAt: { gte: rangeStart },
        direction: "OUTBOUND",
        status: "DELIVERED",
      },
    }),
    prisma.message.count({
      where: {
        createdAt: { gte: rangeStart },
        direction: "OUTBOUND",
        status: "READ",
      },
    }),
  ]);

  const readRate = sent > 0 ? read / sent : 0;

  // ========= Businesses active / dead =========
  const activeBizGroup = await prisma.message.groupBy({
    by: ["businessId"],
    where: { createdAt: { gte: rangeStart } },
    _count: { id: true },
  });
  const activeBusinessCount = activeBizGroup.length;

  const onboardedBiz = await prisma.channelAccount.findMany({
    select: { businessId: true },
    distinct: ["businessId"],
  });
  const onboardedBizIds = onboardedBiz.map((x) => x.businessId);

  const bizWithMsgs7d = await prisma.message.findMany({
    where: {
      businessId: { in: onboardedBizIds },
      createdAt: { gte: start7d },
    },
    select: { businessId: true },
    distinct: ["businessId"],
  });
  const bizWithMsgs7dSet = new Set(bizWithMsgs7d.map((x) => x.businessId));

  const dead7d = onboardedBizIds.filter(
    (id) => !bizWithMsgs7dSet.has(id)
  ).length;

  // ========= Tables =========
  const webhookFailsRaw = await prisma.webhookEvent.findMany({
    where: { receivedAt: { gte: rangeStart }, status: "FAILED" },
    orderBy: { receivedAt: "desc" },
    take: 50,
    select: {
      id: true,
      businessId: true,
      provider: true,
      eventType: true,
      receivedAt: true,
      processedAt: true,
    },
  });

  const outboxFailsRaw = await prisma.outboxMessage.findMany({
    where: { createdAt: { gte: rangeStart }, status: "FAILED" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      businessId: true,
      conversationId: true,
      channel: true,
      contactKey: true,
      lastError: true,
      createdAt: true,
    },
  });

  // Business names map
  const businessIds = Array.from(
    new Set([
      ...webhookFailsRaw
        .map((x) => x.businessId)
        .filter((x): x is string => Boolean(x)),
      ...outboxFailsRaw.map((x) => x.businessId),
      ...activeBizGroup.map((x) => x.businessId),
      ...outboxPendingOldestRaw.map((x) => x.businessId),
    ])
  );

  const businesses = await prisma.business.findMany({
    where: { id: { in: businessIds } },
    select: { id: true, name: true },
  });
  const bizName = new Map(businesses.map((b) => [b.id, b.name]));

  // ========= Top businesses (FIXED orderBy) =========
  const topGroup = await prisma.message.groupBy({
    by: ["businessId"],
    where: { createdAt: { gte: rangeStart } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } }, // ✅ FIX: NO _all
    take: 10,
  });

  const topIds = topGroup.map((x) => x.businessId);

  const [inboundByBiz, outboundByBiz, lastMsgByBiz] = await Promise.all([
    prisma.message.groupBy({
      by: ["businessId"],
      where: {
        businessId: { in: topIds },
        createdAt: { gte: rangeStart },
        direction: "INBOUND",
      },
      _count: { id: true },
    }),
    prisma.message.groupBy({
      by: ["businessId"],
      where: {
        businessId: { in: topIds },
        createdAt: { gte: rangeStart },
        direction: "OUTBOUND",
      },
      _count: { id: true },
    }),
    prisma.message.groupBy({
      by: ["businessId"],
      where: { businessId: { in: topIds }, createdAt: { gte: rangeStart } },
      _max: { createdAt: true },
    }),
  ]);

  const inboundMap = new Map(
    inboundByBiz.map((x) => [x.businessId, x._count.id])
  );
  const outboundMap = new Map(
    outboundByBiz.map((x) => [x.businessId, x._count.id])
  );
  const lastMsgMap = new Map(
    lastMsgByBiz.map((x) => [x.businessId, x._max.createdAt ?? null])
  );

  const waConnected = await prisma.channelAccount.findMany({
    where: { businessId: { in: topIds }, channel: "whatsapp" },
    select: { businessId: true },
    distinct: ["businessId"],
  });
  const waSet = new Set(waConnected.map((x) => x.businessId));

  const topBusinesses = topGroup.map((g) => ({
    businessId: g.businessId,
    businessName: bizName.get(g.businessId) ?? null,
    totalMsgs: g._count.id,
    inbound: inboundMap.get(g.businessId) ?? 0,
    outbound: outboundMap.get(g.businessId) ?? 0,
    lastMsgAtIso: fmtIso(lastMsgMap.get(g.businessId) ?? null),
    whatsappConnected: waSet.has(g.businessId),
  }));

  // ========= Risk businesses =========
  const [fail2hByBiz, pendingByBiz, lastInboundAny] = await Promise.all([
    prisma.outboxMessage.groupBy({
      by: ["businessId"],
      where: { createdAt: { gte: start2h }, status: "FAILED" },
      _count: { id: true },
    }),
    prisma.outboxMessage.groupBy({
      by: ["businessId"],
      where: { status: { in: ["PENDING", "SENDING"] } },
      _count: { id: true },
    }),
    prisma.message.findMany({
      where: { direction: "INBOUND" },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: { businessId: true, createdAt: true },
    }),
  ]);

  const fail2hMap = new Map(
    fail2hByBiz.map((x) => [x.businessId, x._count.id])
  );
  const pendingMap = new Map(
    pendingByBiz.map((x) => [x.businessId, x._count.id])
  );

  const lastInboundMap = new Map<string, Date>();
  for (const m of lastInboundAny) {
    if (!lastInboundMap.has(m.businessId))
      lastInboundMap.set(m.businessId, m.createdAt);
  }

  const riskIds = Array.from(
    new Set([...fail2hMap.keys(), ...pendingMap.keys()])
  ).filter(
    (bizId) =>
      (fail2hMap.get(bizId) ?? 0) >= 3 || (pendingMap.get(bizId) ?? 0) >= 10
  );

  const riskBusinesses = riskIds
    .slice(0, 20)
    .map((businessId) => ({
      businessId,
      businessName: bizName.get(businessId) ?? null,
      failed2h: fail2hMap.get(businessId) ?? 0,
      pending: pendingMap.get(businessId) ?? 0,
      lastInboundAtIso: fmtIso(lastInboundMap.get(businessId) ?? null),
      href: `/admin/businesses/${businessId}`,
    }))
    .sort((a, b) => b.failed2h - a.failed2h || b.pending - a.pending);

  // ========= Onboarding (sin usedAt) =========
  const [tokensCreated, tokensExpired, expiredListRaw] = await Promise.all([
    prisma.onboardingToken.count({ where: { createdAt: { gte: rangeStart } } }),
    prisma.onboardingToken.count({
      where: { createdAt: { gte: rangeStart }, expiresAt: { lt: now } },
    }),
    prisma.onboardingToken.findMany({
      where: { expiresAt: { lt: now } },
      orderBy: { expiresAt: "desc" },
      take: 20,
      select: { id: true, businessId: true, createdAt: true, expiresAt: true },
    }),
  ]);

  const onboardingExpired = expiredListRaw.map((t) => ({
    tokenId: t.id,
    businessId: t.businessId,
    businessName: bizName.get(t.businessId) ?? null,
    createdAtIso: t.createdAt.toISOString(),
    expiresAtIso: t.expiresAt.toISOString(),
  }));

  // ========= Alerts =========
  const alerts: Array<{
    severity: "red" | "orange" | "yellow";
    code: string;
    title: string;
    detail?: string;
    businessId?: string;
    href?: string;
  }> = [];

  const whFailRate2h =
    webhookTotal2h > 0 ? webhookFailed2h / webhookTotal2h : 0;

  if (webhookTotal2h >= 50 && whFailRate2h > 0.02) {
    alerts.push({
      severity: "red",
      code: "WH_FAIL_RATE_HIGH",
      title: "Webhook: tasa de fallos alta (2h)",
      detail: `${webhookFailed2h}/${webhookTotal2h} (${Math.round(
        whFailRate2h * 100
      )}%)`,
    });
  }

  if (webhookLast?.receivedAt) {
    const staleSec = secondsBetween(now, webhookLast.receivedAt);
    if (staleSec > 60 * 60) {
      alerts.push({
        severity: "red",
        code: "WH_STALE",
        title: "Webhook: sin eventos recientes",
        detail: `Último evento hace ${Math.floor(staleSec / 60)} min`,
      });
    }
  } else {
    alerts.push({
      severity: "orange",
      code: "WH_NO_DATA",
      title: "Webhook: sin eventos registrados aún",
    });
  }

  if (outboxFailed2h > 10) {
    alerts.push({
      severity: "red",
      code: "OUTBOX_FAIL_SPIKE",
      title: "Outbox: muchos fallos (2h)",
      detail: `${outboxFailed2h} fallos`,
    });
  }

  if (oldestPendingAgeSec != null && oldestPendingAgeSec > 5 * 60) {
    alerts.push({
      severity: "orange",
      code: "OUTBOX_OLD",
      title: "Outbox: cola envejecida",
      detail: `Mensaje más viejo en cola: ${Math.floor(
        oldestPendingAgeSec / 60
      )} min`,
    });
  }

  if (tokensExpired > 5) {
    alerts.push({
      severity: "yellow",
      code: "ONBOARDING_EXPIRED",
      title: "Onboarding: muchos links expirados",
      detail: `${tokensExpired} expirados (sin métrica de uso todavía)`,
    });
  }

  for (const rb of riskBusinesses.slice(0, 8)) {
    if (rb.failed2h >= 3) {
      alerts.push({
        severity: "orange",
        code: "BIZ_FAILING",
        title: `Negocio con fallos: ${rb.businessName ?? rb.businessId}`,
        detail: `${rb.failed2h} fallos (2h), ${rb.pending} en cola`,
        businessId: rb.businessId,
        href: rb.href,
      });
    }
  }

  const payload = {
    ok: true,
    range,
    nowIso: now.toISOString(),
    kpis: {
      webhook: {
        total: webhookTotal,
        failed: webhookFailed,
        failedRate: webhookTotal > 0 ? webhookFailed / webhookTotal : 0,
        lastEventAtIso: fmtIso(webhookLast?.receivedAt ?? null),
      },
      outbox: {
        pending: outboxPending,
        failed2h: outboxFailed2h,
        oldestPendingAgeSec,
      },
      delivery: { sent, delivered, read, readRate },
      businesses: { active: activeBusinessCount, dead7d },
    },
    alerts,
    tables: {
      webhookFails: webhookFailsRaw.map((x) => ({
        id: x.id,
        atIso: x.receivedAt.toISOString(),
        businessId: x.businessId ?? null,
        businessName: x.businessId ? bizName.get(x.businessId) ?? null : null,
        channel: null,
        error: null,
        provider: x.provider,
        eventType: x.eventType ?? null,
      })),
      outboxFails: outboxFailsRaw.map((x) => ({
        id: x.id,
        atIso: x.createdAt.toISOString(),
        businessId: x.businessId,
        businessName: bizName.get(x.businessId) ?? null,
        to: x.contactKey ?? null,
        error: x.lastError ?? null,
        conversationId: x.conversationId ?? null,
        channel: x.channel,
      })),
      outboxPendingOldest: outboxPendingOldestRaw.map((x) => ({
        id: x.id,
        atIso: x.createdAt.toISOString(),
        businessId: x.businessId,
        businessName: bizName.get(x.businessId) ?? null,
        channel: x.channel,
        contactKey: x.contactKey,
        status: x.status,
        attemptCount: x.attemptCount,
        nextAttemptAtIso: x.nextAttemptAt.toISOString(),
        lastError: x.lastError ?? null,
        conversationId: x.conversationId ?? null,
      })),
      topBusinesses,
      riskBusinesses,
      onboarding: {
        tokensCreated,
        tokensExpired,
        tokensUsed: null,
        conversionRate: null,
      },
      onboardingExpired,
    },
    limitations: {
      onboardingUsedAt:
        "OnboardingToken no tiene usedAt: no se puede medir 'usados' ni conversión aún.",
      webhookError:
        "WebhookEvent no tiene campo error: no se puede mostrar la causa exacta del fallo.",
      webhookChannel:
        "WebhookEvent no tiene channel: no se puede segmentar fallos por canal.",
    },
  };

  setCache(cacheKey, payload);
  return NextResponse.json(payload);
}
