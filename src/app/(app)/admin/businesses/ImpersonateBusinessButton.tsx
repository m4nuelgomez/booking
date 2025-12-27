"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ImpersonateBusinessButton({
  businessId,
  next,
  label = "Entrar como negocio",
  className,
}: {
  businessId: string;
  next: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/admin/business/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, next }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok)
        throw new Error(data?.error ?? `HTTP ${res.status}`);

      const to =
        typeof data?.redirectTo === "string" && data.redirectTo.startsWith("/")
          ? data.redirectTo
          : next;

      router.replace(to);
      router.refresh();
    } catch (e: any) {
      setLoading(false);
      alert(e?.message ?? "No se pudo entrar como negocio.");
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={
        className ??
        "rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/5 disabled:opacity-60"
      }
    >
      {loading ? "Entrando..." : label}
    </button>
  );
}
