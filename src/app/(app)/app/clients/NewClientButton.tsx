"use client";

import { useState } from "react";

export default function NewClientButton({
  onCreated,
}: {
  onCreated?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function create() {
    const n = name.trim();
    const p = phone.trim();

    if (!p) {
      setErr("Teléfono requerido");
      return;
    }

    setErr(null);
    setLoading(true);

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n || null, phone: p }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (res.status === 409) {
        setErr(data?.error ?? "Ya existe un cliente con ese teléfono");
        return;
      }

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }

      setOpen(false);
      setName("");
      setPhone("");
      onCreated?.();
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo crear el cliente");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => {
          setErr(null);
          setOpen(true);
        }}
        className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
      >
        Nuevo cliente
      </button>

      {open ? (
        <div className="fixed inset-0 z-2147483647 bg-black/60 backdrop-blur-sm grid place-items-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-[#0b0f14] shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
              <div className="text-sm font-semibold text-zinc-100">
                Nuevo cliente
              </div>
              <button
                onClick={() => {
                  setOpen(false);
                  setErr(null);
                }}
                className="text-zinc-400 hover:text-zinc-100"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none"
                placeholder="Nombre (opcional)"
              />

              <input
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (err) setErr(null);
                }}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none"
                placeholder="Teléfono *"
              />

              {err ? (
                <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-200">
                  {err}
                </div>
              ) : null}

              <button
                onClick={create}
                disabled={loading}
                className="w-full rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "Creando..." : "Crear cliente"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
