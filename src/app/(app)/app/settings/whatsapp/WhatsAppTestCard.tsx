"use client";

import { useState } from "react";

export default function WhatsAppTestCard({
  connected,
}: {
  connected: boolean;
}) {
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onTest() {
    if (!connected) return;
    const phone = to.trim();
    if (!phone) {
      setMsg("Escribe un número destino (ej: +529933467397).");
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch("/api/settings/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: phone }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok)
        throw new Error(data?.error ?? `HTTP ${res.status}`);

      setMsg("✅ Mensaje de prueba enviado.");
    } catch (e: any) {
      setMsg(e?.message ?? "Error al enviar prueba.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
      <div className="text-sm font-medium">Probar envío</div>

      <p className="text-sm text-white/60">
        Envía un mensaje de prueba desde el WhatsApp conectado a este negocio.
      </p>

      <div className="flex flex-col gap-2">
        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="+52..."
          className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none"
          disabled={!connected || loading}
        />

        <button
          onClick={onTest}
          disabled={!connected || loading}
          className="rounded-xl bg-white text-black px-3 py-2 text-sm font-medium disabled:opacity-60"
        >
          {loading ? "Enviando..." : "Enviar prueba"}
        </button>

        {msg && <div className="text-sm text-white/70">{msg}</div>}

        {!connected && (
          <div className="text-xs text-white/45">
            Conecta WhatsApp primero para poder enviar una prueba.
          </div>
        )}
      </div>
    </div>
  );
}
