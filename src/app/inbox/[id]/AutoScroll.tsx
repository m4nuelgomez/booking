"use client";

import { useEffect } from "react";

export function AutoScroll() {
  useEffect(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" as any });
  }, []);

  return null;
}