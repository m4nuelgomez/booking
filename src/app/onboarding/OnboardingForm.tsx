"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OnboardingForm({ next }: { next: string }) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/business/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n, next }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }

      const redirectTo =
        typeof data?.redirectTo === "string" && data.redirectTo.startsWith("/")
          ? data.redirectTo
          : "/inbox";

      router.replace(redirectTo);
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Failed");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block text-sm text-zinc-300">Business name</label>
      <input
        className="w-full rounded-xl bg-zinc-950 border border-white/10 px-3 py-2 outline-none focus:border-white/20 text-white"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Barbería Maniática"
        autoFocus
      />

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <button
        disabled={loading}
        className="w-full rounded-xl bg-white text-black px-3 py-2 font-medium disabled:opacity-60"
      >
        {loading ? "Creating..." : "Create"}
      </button>
    </form>
  );
}
