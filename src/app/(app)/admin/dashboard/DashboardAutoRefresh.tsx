"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardAutoRefresh({
  intervalMs = 5000,
  visibleOnly = true,
}: {
  intervalMs?: number;
  visibleOnly?: boolean;
}) {
  const router = useRouter();
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    let timer: any;

    function tick() {
      if (pausedRef.current) return;
      if (visibleOnly && document.visibilityState !== "visible") return;
      router.refresh();
    }

    timer = setInterval(tick, intervalMs);

    return () => clearInterval(timer);
  }, [router, intervalMs, visibleOnly]);

  return (
    <div className="flex items-center justify-end gap-2">
      <span className="text-xs text-zinc-500">
        Auto-refresh: {paused ? "OFF" : "ON"} · {Math.round(intervalMs / 1000)}s
      </span>
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-900"
      >
        {paused ? "Reanudar" : "Pausar"}
      </button>
    </div>
  );
}
