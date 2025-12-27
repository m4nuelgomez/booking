"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteBusinessButton({
  businessId,
}: {
  businessId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const canDelete = confirm.trim().toUpperCase() === "ELIMINAR";

  async function onDelete() {
    if (!canDelete || loading) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/businesses/${businessId}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok)
        throw new Error(data?.error ?? `HTTP ${res.status}`);

      setOpen(false);
      setConfirm("");
      router.push("/admin/businesses");
      router.refresh();
    } catch (e: any) {
      alert(e?.message ?? "Error al eliminar negocio");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        disabled={loading}
        className="rounded-xl border border-red-500/30 px-3 py-2 text-sm font-medium text-red-200 hover:bg-red-500/10"
        onClick={() => setOpen(true)}
      >
        Eliminar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 p-4 shadow-xl border border-white/10">
            <div className="text-lg font-semibold">Eliminar negocio</div>
            <p className="mt-2 text-sm text-white/60">
              Esto ocultará el negocio. Para confirmar, escribe <b>ELIMINAR</b>.
            </p>

            <input
              className="mt-3 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Escribe ELIMINAR"
              autoFocus
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-xl px-3 py-2 text-sm bg-white/10 hover:bg-white/15"
                onClick={() => {
                  setOpen(false);
                  setConfirm("");
                  setLoading(false);
                }}
                disabled={loading}
              >
                Cancelar
              </button>

              <button
                className="rounded-xl px-3 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50"
                onClick={onDelete}
                disabled={!canDelete || loading}
              >
                {loading ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
