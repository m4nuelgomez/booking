import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

function cleanStr(x: unknown) {
  return typeof x === "string" ? x.trim() : "";
}

function normalizeNext(nextRaw: unknown) {
  const next = cleanStr(nextRaw);

  if (!next.startsWith("/")) return "";

  if (!next.startsWith("/app")) return "";

  if (next.startsWith("//")) return "";

  return next;
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; next?: string }>;
}) {
  const sp = await searchParams;

  const token = cleanStr(sp?.token);
  const next = normalizeNext(sp?.next);

  if (!token) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-zinc-950 text-white">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow space-y-3">
          <h1 className="text-xl font-semibold">Selecciona un negocio</h1>
          <p className="text-sm text-white/70">
            Todavía no hay un negocio activo en esta sesión.
          </p>

          <div className="pt-2 flex gap-2">
            <Link
              href="/admin/businesses"
              className="rounded-xl bg-white text-black px-4 py-2 text-sm font-medium"
            >
              Ir a Negocios
            </Link>
            <Link
              href="/admin/businesses/new"
              className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/5"
            >
              Crear negocio
            </Link>
          </div>

          {next ? (
            <p className="text-xs text-white/40 pt-2">
              Después podrás regresar a:{" "}
              <span className="font-mono">{next}</span>
            </p>
          ) : null}
        </div>
      </main>
    );
  }

  const record = await prisma.onboardingToken.findUnique({
    where: { token },
    select: {
      token: true,
      expiresAt: true,
      business: { select: { id: true, name: true } },
    },
  });

  if (!record || record.expiresAt < new Date()) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-zinc-950 text-white">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow space-y-2">
          <h1 className="text-xl font-semibold">Enlace no válido</h1>
          <p className="text-sm text-white/70">
            Este enlace expiró o ya no es válido. Pide uno nuevo al
            administrador.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-xl bg-white text-black px-4 py-2 text-sm font-medium mt-2"
          >
            Ir a Login
          </Link>
        </div>
      </main>
    );
  }

  redirect(
    `/api/onboarding/accept?token=${encodeURIComponent(record.token)}${
      next ? `&next=${encodeURIComponent(next)}` : ""
    }`
  );
}
