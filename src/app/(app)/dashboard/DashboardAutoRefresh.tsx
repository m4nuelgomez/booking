"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardAutoRefresh({ ms = 5000 }: { ms?: number }) {
  const router = useRouter();

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
    };

    const t = setInterval(tick, ms);
    return () => clearInterval(t);
  }, [router, ms]);

  return null;
}
