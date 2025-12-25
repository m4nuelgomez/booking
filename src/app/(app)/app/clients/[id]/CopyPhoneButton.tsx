"use client";

import { useState } from "react";

export default function CopyPhoneButton({ phone }: { phone: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      alert("No se pudo copiar");
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className="flex w-full items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
    >
      {copied ? "Copiado ✅" : "Copiar teléfono"}
    </button>
  );
}
