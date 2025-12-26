"use client";

import { useEffect, useMemo, useState } from "react";

type Client = { id: string; name: string | null; phone: string };
type Props = {
  conversationId: string;
  channel: string;
  contactKey: string;
  contactDisplay?: string | null;
  initialClient: Client | null;
  onDone?: () => void;
};

export default function ClientLinkButton({
  conversationId,
  channel,
  contactKey,
  contactDisplay,
  initialClient,
  onDone,
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Client[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState(
    channel === "whatsapp" ? contactKey : ""
  );

  const displayInitialName = useMemo(() => {
    if (!initialClient) return null;
    return (
      initialClient.name?.trim() ||
      initialClient.phone ||
      contactDisplay ||
      "Cliente"
    );
  }, [initialClient]);

  const title = initialClient
    ? displayInitialName ?? "Cliente"
    : "Vincular cliente";

  async function load(search: string) {
    setLoading(true);

    try {
      const res = await fetch(`/api/clients?q=${encodeURIComponent(search)}`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }

      setItems(
        (data.items ?? []).map((x: any) => ({
          id: String(x.id),
          name: x.name ?? null,
          phone: String(x.phone ?? ""),
        }))
      );
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load clients");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    load(q.trim());
  }, [open, q]);

  async function onSearch() {
    setErr(null);
    await load(q.trim());
  }

  async function link(clientId: string | null) {
    setErr(null);

    try {
      const res = await fetch(
        `/api/conversations/${conversationId}/link-client`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId }),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }

      setOpen(false);
      onDone?.();

      // fallback si no pasas onDone
      if (!onDone) window.location.reload();
    } catch (e: any) {
      setErr(e?.message ?? "Link failed");
    }
  }

  async function createAndLink() {
    const name = newName.trim();
    const phone = newPhone.trim();

    if (!name && !phone) {
      setErr("Nombre o teléfono requerido");
      return;
    }

    setErr(null);

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          name: name || null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 409) {
        const existingId = data?.existingClient?.id
          ? String(data.existingClient.id)
          : null;

        if (existingId) {
          await link(existingId);
          return;
        }

        const msg =
          data?.message ??
          data?.error ??
          "Ya existe un cliente con ese teléfono";
        setErr(msg);
        setQ(phone);
        return;
      }

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }

      await link(String(data.client.id));
    } catch (e: any) {
      setErr(e?.message ?? "Create failed");
    }
  }

  return (
    <>
      <button
        onClick={() => {
          setErr(null);
          setOpen(true);
        }}
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/90 hover:bg-white/10"
        title={title}
      >
        {initialClient ? "Cliente" : "Vincular"}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[2147483647] bg-black/60 backdrop-blur-sm grid place-items-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#111b21] shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="text-sm font-semibold text-white">
                Vincular cliente
              </div>
              <button
                onClick={() => {
                  setOpen(false);
                  setErr(null);
                }}
                className="text-white/70 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4">
              {initialClient ? (
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="text-sm text-white">
                    Actual:{" "}
                    <span className="font-semibold">
                      {displayInitialName ?? "Cliente"}
                    </span>
                  </div>
                  <div className="text-xs text-white/60 mt-1">
                    {initialClient.phone || contactDisplay || "—"}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => link(null)}
                      className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200 hover:bg-red-500/20"
                    >
                      Desvincular
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Buscar */}
              <div className="flex gap-2">
                <input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    if (err) setErr(null);
                  }}
                  className="flex-1 rounded-xl bg-zinc-950 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                  placeholder="Buscar por nombre o teléfono…"
                />
                <button
                  onClick={onSearch}
                  className="rounded-xl bg-white text-black px-4 py-2 text-sm font-semibold hover:opacity-90"
                >
                  Buscar
                </button>
              </div>

              {err ? (
                <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {err}
                </div>
              ) : null}

              {/* Resultados */}
              <div className="rounded-xl border border-white/10 overflow-hidden">
                <div className="px-3 py-2 text-xs text-white/60 border-b border-white/10">
                  Resultados
                </div>

                {loading ? (
                  <div className="p-3 text-sm text-white/60">Cargando…</div>
                ) : items.length === 0 ? (
                  <div className="p-3 text-sm text-white/60">
                    Sin resultados.
                  </div>
                ) : (
                  <ul className="divide-y divide-white/10">
                    {items.map((c) => {
                      const name = c.name?.trim() || c.phone || "Cliente";
                      return (
                        <li
                          key={c.id}
                          className="p-3 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="text-sm text-white truncate">
                              {name}
                            </div>
                            <div className="text-xs text-white/60 truncate">
                              {c.phone}
                            </div>
                          </div>

                          <button
                            onClick={() => link(c.id)}
                            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/90 hover:bg-white/10"
                          >
                            Vincular
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Crear */}
              <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
                <div className="text-xs text-white/60">
                  Crear cliente rápido
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="rounded-xl bg-zinc-950 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                    placeholder="Nombre (opcional)"
                  />
                  <input
                    value={newPhone}
                    onChange={(e) => {
                      setNewPhone(e.target.value);
                      if (err) setErr(null);
                    }}
                    className="rounded-xl bg-zinc-950 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                    placeholder={
                      channel === "whatsapp"
                        ? "Teléfono (WhatsApp)"
                        : "Teléfono (opcional)"
                    }
                  />
                </div>

                <button
                  onClick={createAndLink}
                  className="rounded-xl bg-white text-black px-4 py-2 text-sm font-semibold hover:opacity-90"
                >
                  Crear y vincular
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
