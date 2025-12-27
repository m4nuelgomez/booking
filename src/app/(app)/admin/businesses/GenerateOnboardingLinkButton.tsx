"use client";

import { useEffect, useMemo, useState } from "react";

export default function GenerateOnboardingLinkButton({
  businessId,
  variant = "copy",
}: {
  businessId: string;
  variant?: "copy" | "open";
}) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [msg, setMsg] = useState<string>("");
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  const label = useMemo(() => {
    if (loading) return "Generando…";
    if (variant === "open") return "Generar y abrir";
    return "Generar y copiar";
  }, [loading, variant]);

  useEffect(() => {
    if (status === "idle") return;
    const t = setTimeout(() => setStatus("idle"), 1800);
    return () => clearTimeout(t);
  }, [status]);

  async function run() {
    setLoading(true);
    setStatus("idle");
    setMsg("");

    try {
      const res = await fetch(
        `/api/admin/businesses/${encodeURIComponent(
          businessId
        )}/onboarding-token`,
        { method: "POST" }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok || typeof data?.onboardingUrl !== "string") {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }

      const absolute = `${window.location.origin}${data.onboardingUrl}`;
      setLastUrl(absolute);

      if (variant === "open") {
        window.open(absolute, "_blank", "noopener,noreferrer");
        setStatus("ok");
        setMsg("Abierto ✅");
      } else {
        await navigator.clipboard.writeText(absolute);
        setStatus("ok");
        setMsg("Copiado ✅");
      }
    } catch (e: any) {
      setStatus("error");
      setMsg(e?.message ?? "Error generando enlace");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <button
        onClick={run}
        disabled={loading}
        className={
          variant === "open"
            ? "rounded-xl bg-white text-black px-3 py-2 text-sm font-medium disabled:opacity-60"
            : "rounded-xl border border-white/15 px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/5 disabled:opacity-60"
        }
      >
        {label}
      </button>

      {status === "ok" ? (
        <span className="text-xs text-green-300">{msg}</span>
      ) : status === "error" ? (
        <span className="text-xs text-red-300">{msg}</span>
      ) : lastUrl ? (
        <span className="text-xs text-white/40 truncate max-w-[360px]">
          {lastUrl}
        </span>
      ) : null}
    </div>
  );
}
