"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/inbox";

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }

      router.replace(next.startsWith("/") ? next : "/inbox");
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Login failed");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block text-sm text-zinc-300">Password</label>
      <input
        type="password"
        className="w-full rounded-xl bg-zinc-950 border border-white/10 px-3 py-2 outline-none focus:border-white/20"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoFocus
      />

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <button
        disabled={loading}
        className="w-full rounded-xl bg-white text-black px-3 py-2 font-medium disabled:opacity-60"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
