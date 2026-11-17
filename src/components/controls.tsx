"use client";

import { useState, useTransition } from "react";
import { ChevronRight } from "lucide-react";

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className="switch" onClick={() => onChange(!checked)}>
      <span />
    </button>
  );
}

/** Fila de tabla expandible. `cells` son <td> (renderizados en el servidor) y `detail` el contenido desplegado. */
export function ExpandRows({ cells, detail, colSpan, label }: { cells: React.ReactNode; detail: React.ReactNode; colSpan: number; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr
        className={`cursor-pointer ${open ? "[&>td]:bg-n100" : ""}`}
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest("a,button,input,select,textarea,label")) setOpen((o) => !o);
        }}
      >
        <td className="!w-8 !pr-0">
          <button type="button" aria-expanded={open} aria-label={`${open ? "Contraer" : "Expandir"} ${label}`} onClick={() => setOpen((o) => !o)} className="grid h-8 w-8 cursor-pointer place-items-center border-0 bg-transparent text-muted">
            <ChevronRight size={14} strokeWidth={2.4} className={`transition-transform duration-150 ${open ? "rotate-90" : ""}`} aria-hidden />
          </button>
        </td>
        {cells}
      </tr>
      {open && (
        <tr className="[&>td]:bg-n100">
          <td />
          <td colSpan={colSpan} className="!pb-5 !pt-3">{detail}</td>
        </tr>
      )}
    </>
  );
}

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Ejecuta una acción de servidor con estado de carga y error. */
export function useRun() {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  function run<R extends ActionResult>(fn: () => Promise<R>, onOk?: (r: Extract<R, { ok: true }>) => void) {
    start(async () => {
      setError("");
      try {
        const r = await fn();
        if (r.ok) onOk?.(r as Extract<R, { ok: true }>);
        else setError(r.error);
      } catch {
        setError("No se pudo completar la operación. Intente nuevamente.");
      }
    });
  }
  return { pending, error, setError, run };
}
