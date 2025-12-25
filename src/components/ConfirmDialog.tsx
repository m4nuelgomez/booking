"use client";

import { useEffect, useRef } from "react";

type Variant = "danger" | "default";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "default",
  loading = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: Variant;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  // Focus al abrir
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      // por default enfoca "Cancelar" (seguro en acciones destructivas)
      cancelRef.current?.focus();
    }, 0);
    return () => clearTimeout(t);
  }, [open]);

  // ESC para cerrar
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      // Tab: mini "trap" (no perfecto, pero suficiente para MVP)
      if (e.key === "Tab") {
        const cancelEl = cancelRef.current;
        const confirmEl = confirmRef.current;
        if (!cancelEl || !confirmEl) return;

        const active = document.activeElement;
        const goingBack = e.shiftKey;

        if (!goingBack && active === confirmEl) {
          e.preventDefault();
          cancelEl.focus();
        } else if (goingBack && active === cancelEl) {
          e.preventDefault();
          confirmEl.focus();
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const confirmClasses =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-500"
      : "bg-emerald-600 hover:bg-emerald-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      {/* Backdrop click */}
      <button
        aria-label="Cerrar"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <div className="relative w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
            {description ? (
              <p className="mt-2 text-sm text-zinc-400">{description}</p>
            ) : null}
          </div>

          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-zinc-400 hover:bg-zinc-900"
            aria-label="Cerrar"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelRef}
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900 disabled:opacity-60"
          >
            {cancelText}
          </button>

          <button
            ref={confirmRef}
            onClick={onConfirm}
            disabled={loading}
            className={[
              "rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60",
              confirmClasses,
            ].join(" ")}
          >
            {loading ? "Procesando..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
