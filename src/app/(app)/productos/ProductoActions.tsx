"use client";

import { useState } from "react";
import Link from "next/link";
import { alternarProductoAction } from "@/actions/maestros";
import { useRun } from "@/components/controls";

export function ProductoActions({ cod, activo, stock, stockTxt }: { cod: string; activo: boolean; stock: number; stockTxt: string }) {
  const [confirm, setConfirm] = useState(false);
  const { pending, error, run } = useRun();
  const enc = encodeURIComponent(cod);

  if (confirm) {
    return (
      <span className="inline-flex flex-wrap items-center justify-end gap-1.5 text-xs">
        <span className="font-semibold text-a800" role="alert">{activo ? (stock ? `Tiene ${stockTxt} en stock. ¿Desactivar?` : "¿Desactivar?") : "¿Activar?"}</span>
        {error && <span className="field-err">{error}</span>}
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setConfirm(false)}>No</button>
        <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => run(() => alternarProductoAction({ cod }), () => setConfirm(false))}>Sí</button>
      </span>
    );
  }
  return (
    <span className="inline-flex gap-1">
      <Link href={`/productos/${enc}`} className="btn btn-ghost btn-sm no-underline">Ver ficha</Link>
      <Link href={`/productos/${enc}/editar`} className="btn btn-ghost btn-ghost-ink btn-sm no-underline !text-ink">Editar</Link>
      <button type="button" className="btn btn-ghost btn-sm !text-n700" onClick={() => setConfirm(true)}>{activo ? "Desactivar" : "Activar"}</button>
    </span>
  );
}
