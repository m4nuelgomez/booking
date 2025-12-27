"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RestoreBusinessButton({
  businessId,
}: {
  businessId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onRestore() {
    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/businesses/${businessId}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok)
        throw new Error(data?.error ?? `HTTP ${res.status}`);

      // Regresa a Activos y refresca
      router.push("/admin/businesses");
      router.refresh();
    } catch (e: any) {
      alert(e?.message ?? "Error al restaurar negocio");
      setLoading(false);
    }
  }

  return (
    <button
      onClick={onRestore}
      disabled={loading}
      className="rounded-xl border border-white/15 px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/5 disabled:opacity-60"
      title="Restaurar negocio"
    >
      {loading ? "Restaurando..." : "Restaurar"}
    </button>
  );
}
