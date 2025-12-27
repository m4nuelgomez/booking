"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ApiOk = {
  ok: true;
  business: { id: string; name: string; createdAt: string };
  onboardingUrl: string;
};

export default function NewBusinessForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [created, setCreated] = useState<{
    id: string;
    name: string;
    onboardingUrl: string;
  } | null>(null);

  const fullOnboardingUrl = useMemo(() => {
    if (!created) return "";
    if (typeof window === "undefined") return created.onboardingUrl;
    return window.location.origin + created.onboardingUrl;
  }, [created]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const n = name.trim();
    if (!n) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n, next: "/app/dashboard" }),
      });

      const data = (await res.json().catch(() => ({}))) as Partial<ApiOk> & {
        ok?: boolean;
        error?: string;
      };

      if (!res.ok || !data?.ok || !data.business?.id || !data.onboardingUrl) {
        throw new Error(
          data?.error ?? `No se pudo crear el negocio (HTTP ${res.status}).`
        );
      }

      setCreated({
        id: data.business.id,
        name: data.business.name ?? n,
        onboardingUrl: data.onboardingUrl,
      });

      setName("");
      setLoading(false);

      // Refresca lista si el usuario vuelve atrás
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "No se pudo crear el negocio.");
      setLoading(false);
    }
  }

  async function onCopy() {
    if (!created) return;

    try {
      const text = fullOnboardingUrl || created.onboardingUrl;
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback simple
      try {
        window.prompt(
          "Copia el enlace:",
          fullOnboardingUrl || created.onboardingUrl
        );
      } catch {}
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block text-sm text-white/80">
          Nombre del negocio
        </label>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl bg-zinc-950 border border-white/10 px-3 py-2 outline-none focus:border-white/20"
          placeholder="Ej. Barbería El Rey"
          autoFocus
          disabled={loading}
        />

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <button
          disabled={loading || !name.trim()}
          className="w-full rounded-xl bg-white text-black px-3 py-2 font-medium disabled:opacity-60"
        >
          {loading ? "Creando..." : "Crear negocio"}
        </button>
      </form>

      {created ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="text-sm">
            <div className="text-white/60 text-xs">Negocio creado</div>
            <div className="font-semibold">{created.name}</div>
            <div className="mt-1 text-xs text-white/50 font-mono break-all">
              {created.id}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-zinc-950 p-3">
            <div className="text-xs text-white/60">
              Enlace de acceso (onboarding)
            </div>
            <div className="mt-1 text-[11px] text-white/80 font-mono break-all">
              {fullOnboardingUrl || created.onboardingUrl}
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={onCopy}
                className="rounded-xl border border-white/15 px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/5"
              >
                Copiar enlace
              </button>

              <a
                href={created.onboardingUrl}
                className="rounded-xl bg-white text-black px-3 py-2 text-sm font-medium"
              >
                Abrir onboarding
              </a>
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/admin/businesses/${created.id}`}
              className="rounded-xl border border-white/15 px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/5"
            >
              Ver detalle
            </Link>

            <Link
              href="/admin/businesses"
              className="rounded-xl border border-white/15 px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/5"
            >
              Volver a lista
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
