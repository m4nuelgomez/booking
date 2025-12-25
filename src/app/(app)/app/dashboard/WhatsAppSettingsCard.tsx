"use client";

import { useEffect, useState } from "react";

type WAAccount = {
  id: string;
  phoneNumberId: string;
  displayNumber: string | null;
  wabaId: string | null;
};

export default function WhatsAppSettingsCard() {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<WAAccount[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [displayNumber, setDisplayNumber] = useState("");
  const [wabaId, setWabaId] = useState("");

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/whatsapp/accounts", { method: "GET" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok)
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      setAccounts(data.accounts ?? []);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load WhatsApp settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const linked = accounts.length > 0;

  async function onLink() {
    const pid = phoneNumberId.trim();
    if (!pid) {
      setErr("phoneNumberId is required");
      return;
    }

    setErr(null);
    try {
      const res = await fetch("/api/whatsapp/accounts/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumberId: pid,
          displayNumber: displayNumber.trim() || null,
          wabaId: wabaId.trim() || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok)
        throw new Error(data?.error ?? `HTTP ${res.status}`);

      // refresh estado
      setPhoneNumberId("");
      setDisplayNumber("");
      setWabaId("");
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Link failed");
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="text-sm text-zinc-300">WhatsApp</div>
        {linked ? (
          <span className="rounded-full bg-emerald-600/20 px-2 py-1 text-xs font-semibold text-emerald-300">
            Conectado
          </span>
        ) : (
          <span className="rounded-full bg-zinc-700/40 px-2 py-1 text-xs font-semibold text-zinc-300">
            No conectado
          </span>
        )}
      </div>

      <div className="p-4">
        {loading ? (
          <div className="text-sm text-zinc-400">Cargando…</div>
        ) : linked ? (
          <div className="space-y-2">
            {accounts.map((a) => (
              <div
                key={a.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950 p-3"
              >
                <div className="text-sm text-zinc-200">
                  {a.displayNumber ?? "Número (no guardado)"}
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  phoneNumberId: {a.phoneNumberId}
                </div>
                {a.wabaId ? (
                  <div className="mt-1 text-xs text-zinc-500">
                    wabaId: {a.wabaId}
                  </div>
                ) : null}
              </div>
            ))}
            <div className="text-xs text-zinc-500">
              *Para cambiarlo, vuelve a linkear con otro phoneNumberId.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-zinc-400">
              Pega los datos de Meta (API Setup).
            </div>

            <div className="grid gap-2 md:grid-cols-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  phoneNumberId *
                </label>
                <input
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  className="w-full rounded-xl bg-zinc-950 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/20"
                  placeholder="856086410929751"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  displayNumber
                </label>
                <input
                  value={displayNumber}
                  onChange={(e) => setDisplayNumber(e.target.value)}
                  className="w-full rounded-xl bg-zinc-950 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/20"
                  placeholder="+1 555 145 3414"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  wabaId
                </label>
                <input
                  value={wabaId}
                  onChange={(e) => setWabaId(e.target.value)}
                  className="w-full rounded-xl bg-zinc-950 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/20"
                  placeholder="1526875495220636"
                />
              </div>
            </div>

            {err ? <div className="text-sm text-red-400">{err}</div> : null}

            <button
              onClick={onLink}
              className="rounded-xl bg-white text-black px-4 py-2 text-sm font-semibold hover:opacity-90"
            >
              Conectar WhatsApp
            </button>
          </div>
        )}

        {err && linked ? (
          <div className="mt-3 text-sm text-red-400">{err}</div>
        ) : null}
      </div>
    </div>
  );
}
