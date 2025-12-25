"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  dep: number;
  force?: boolean;
};

export default function AutoScroll({ dep, force = false }: Props) {
  const containerRef = useRef<HTMLElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [shouldStick, setShouldStick] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => {
      const threshold = 120;
      const distanceFromBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight;
      setShouldStick(distanceFromBottom < threshold);
    };

    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!bottomRef.current) return;
    if (force || shouldStick) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [dep, force, shouldStick]);

  return (
    <>
      {/* Este script captura el contenedor scrollable automáticamente */}
      <CaptureScrollContainer onFound={(el) => (containerRef.current = el)} />
      <div ref={bottomRef} />
    </>
  );
}

function CaptureScrollContainer({
  onFound,
}: {
  onFound: (el: HTMLElement) => void;
}) {
  const markerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    let el: HTMLElement | null = marker.parentElement;
    while (el) {
      const style = window.getComputedStyle(el);
      const overflowY = style.overflowY;
      if (overflowY === "auto" || overflowY === "scroll") {
        onFound(el);
        break;
      }
      el = el.parentElement;
    }
  }, [onFound]);

  return <div ref={markerRef} />;
}
