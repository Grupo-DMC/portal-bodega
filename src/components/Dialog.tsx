"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Diálogo/cajón accesible: role=dialog + aria-modal, Escape cierra, el foco queda atrapado
 * dentro y vuelve al elemento que lo abrió, y el scroll de la página se bloquea.
 */
export function Dialog({
  label, onClose, children, variant = "center", className = "",
}: { label: string; onClose: () => void; children: React.ReactNode; variant?: "center" | "right"; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const el = ref.current;
    (el?.querySelector<HTMLElement>("[data-autofocus]") ?? el?.querySelector<HTMLElement>(FOCUSABLE) ?? el)?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !el) return;
      const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prev?.focus?.();
    };
  }, []);

  const right = variant === "right";
  return (
    // stopPropagation: el diálogo puede abrirse dentro de una fila clicable; sus clics no deben alcanzarla.
    <div onClick={(e) => e.stopPropagation()} className={`fixed inset-0 z-[100] ${right ? "" : "flex items-center justify-center p-3 sm:p-6"}`}>
      <div className="fade absolute inset-0 bg-n900/55" onClick={() => closeRef.current()} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={
          right
            ? `slide-in absolute inset-y-0 right-0 flex w-full max-w-[460px] flex-col border-l-4 border-accent bg-white shadow-lg ${className}`
            : `rise relative flex max-h-full w-full flex-col border-t-4 border-accent bg-white shadow-lg ${className}`
        }
      >
        {children}
      </div>
    </div>
  );
}
