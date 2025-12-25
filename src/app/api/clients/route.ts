import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusinessIdFromReq } from "@/lib/auth-api";
import { Prisma } from "@prisma/client";

const TAKE = 50;

export async function GET(req: NextRequest) {
  try {
    const auth = requireBusinessIdFromReq(req);
    if (!auth.ok) {
      return NextResponse.json(
        { ok: false, error: auth.error },
        { status: auth.status }
      );
    }
    const businessId = auth.businessId;

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();

    const items = await prisma.client.findMany({
      where: {
        businessId,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { phone: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: TAKE,
      select: {
        id: true,
        name: true,
        phone: true,
        updatedAt: true,
        _count: { select: { appointments: true, conversations: true } },
      },
    });

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

function normalizeMXPhone(input: string) {
  const digits = input.replace(/\D/g, "");

  if (digits.length === 10) return `+52${digits}`;
  if (digits.startsWith("52") && digits.length === 12) return `+${digits}`;

  throw new Error("Número de teléfono inválido");
}

export async function POST(req: NextRequest) {
  let phone = "";
  let businessId: string | null = null;

  try {
    const auth = requireBusinessIdFromReq(req);
    if (!auth.ok) {
      return NextResponse.json(
        { ok: false, error: auth.error },
        { status: auth.status }
      );
    }
    businessId = auth.businessId;

    const body = await req.json().catch(() => ({}));
    const rawName = body?.name;
    const rawPhone = body?.phone;

    const name = rawName == null ? null : String(rawName).trim() || null;
    const rawPhoneStr = String(rawPhone ?? "").trim();

    if (!rawPhoneStr) {
      return NextResponse.json(
        { ok: false, error: "phone is required" },
        { status: 400 }
      );
    }

    try {
      phone = normalizeMXPhone(rawPhoneStr);
    } catch {
      return NextResponse.json(
        { ok: false, error: "Número de teléfono inválido" },
        { status: 400 }
      );
    }

    const client = await prisma.client.create({
      data: { businessId, phone, name },
      select: { id: true, name: true, phone: true },
    });

    return NextResponse.json({ ok: true, client });
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        const existing =
          businessId && phone
            ? await prisma.client.findFirst({
                where: { businessId, phone },
                select: { id: true, name: true, phone: true },
              })
            : null;

        return NextResponse.json(
          {
            ok: false,
            error: "CLIENT_EXISTS",
            message: "Ya existe un cliente con ese teléfono",
            existingClient: existing,
          },
          { status: 409 }
        );
      }
    }

    const msg = (e as any)?.message ?? "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
