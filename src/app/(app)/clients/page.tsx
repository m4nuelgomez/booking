"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NewClientButton from "./NewClientButton";

type Item = {
  id: string;
  name: string | null;
  phone: string;
  updatedAt: string;
  _count: { appointments: number; conversations: number };
};

export default function ClientsPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load(query: string) {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/clients?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok || !data?.ok)
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      setItems(data.items ?? []);
    } catch (e: any) {
      setErr(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load("");
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <p className="text-sm text-zinc-400">
            {loading ? "Cargando..." : `${items.length} cliente(s)`}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full max-w-sm">
          <NewClientButton onCreated={() => load(q)} />

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o teléfono..."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
          />
        </div>
      </div>

      {err ? (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-200">
          {err}
        </div>
      ) : null}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30">
        {items.length === 0 && !loading ? (
          <div className="px-4 py-10 text-center text-sm text-zinc-400">
            Aún no hay clientes.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {items.map((c) => {
              const who = c.name?.trim() ? c.name : c.phone;
              const when = new Date(c.updatedAt).toLocaleString("es-MX");
              return (
                <li key={c.id} className="px-4 py-4">
                  <Link href={`/clients/${c.id}`} className="block">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-base font-semibold">{who}</div>
                        <div className="mt-1 text-sm text-zinc-400">
                          {c.phone}
                        </div>
                        <div className="mt-2 text-xs text-zinc-500">
                          Última actividad: {when}
                        </div>
                      </div>

                      <div className="flex gap-2 text-xs">
                        <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-zinc-300">
                          Citas: {c._count.appointments}
                        </span>
                        <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-zinc-300">
                          Chats: {c._count.conversations}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
