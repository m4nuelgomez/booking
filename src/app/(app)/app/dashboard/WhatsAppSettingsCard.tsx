"use client";

import { useEffect, useState } from "react";

type WAAccount = {
  id: string;
  providerAccountId: string;
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
  const [accessToken, setAccessToken] = useState("");

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
      const res = await fetch("/api/settings/whatsapp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumberId: pid,
          displayNumber: displayNumber.trim() || null,
          wabaId: wabaId.trim() || null,
          accessToken: accessToken.trim() || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok)
        throw new Error(data?.error ?? `HTTP ${res.status}`);

      setPhoneNumberId("");
      setDisplayNumber("");
      setWabaId("");
      setAccessToken("");

      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Link failed");
    }
  }

  return (
    <div className="wa-card">
      <div className="flex items-center justify-between wa-cardHeader px-4 py-3">
        <div className="text-sm text-white/75">WhatsApp</div>

        {linked ? (
          <span className="rounded-full bg-emerald-600/20 px-2 py-1 text-xs font-semibold text-emerald-300">
            Conectado
          </span>
        ) : (
          <span className="rounded-full bg-white/5 px-2 py-1 text-xs font-semibold text-white/60">
            No conectado
          </span>
        )}
      </div>

      <div className="p-4">
        {loading ? (
          <div className="text-sm text-white/60">Cargando…</div>
        ) : linked ? (
          <div className="space-y-2">
            {accounts.map((a) => (
              <div
                key={a.id}
                className="rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <div className="text-sm text-white/85">
                  {a.displayNumber ?? "Número (no guardado)"}
                </div>
                <div className="mt-1 text-xs text-white/45">
                  phoneNumberId: {a.providerAccountId}
                </div>
                {a.wabaId ? (
                  <div className="mt-1 text-xs text-white/45">
                    wabaId: {a.wabaId}
                  </div>
                ) : null}
              </div>
            ))}

            <div className="text-xs text-white/45">
              *Para cambiarlo, vuelve a linkear con otro phoneNumberId.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-white/60">
              Pega los datos de Meta (API Setup).
            </div>

            <div className="grid gap-2 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs text-white/60">
                  phoneNumberId *
                </label>
                <input
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none placeholder:text-white/30 focus:border-white/20"
                  placeholder="856086410929751"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-white/60">
                  accessToken (opcional)
                </label>
                <input
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none placeholder:text-white/30 focus:border-white/20"
                  placeholder="EAA..."
                />
                <div className="mt-1 text-[11px] text-white/45">
                  *Si lo pegas aquí, este negocio podrá enviar WhatsApps sin
                  depender del .env
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-white/60">
                  displayNumber
                </label>
                <input
                  value={displayNumber}
                  onChange={(e) => setDisplayNumber(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none placeholder:text-white/30 focus:border-white/20"
                  placeholder="+1 555 145 3414"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-white/60">
                  wabaId
                </label>
                <input
                  value={wabaId}
                  onChange={(e) => setWabaId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none placeholder:text-white/30 focus:border-white/20"
                  placeholder="1526875495220636"
                />
              </div>
            </div>

            {err ? <div className="text-sm text-red-400">{err}</div> : null}

            <button
              onClick={onLink}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/85 hover:bg-white/10"
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
