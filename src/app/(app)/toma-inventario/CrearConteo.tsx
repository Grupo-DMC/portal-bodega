"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { crearConteoAction } from "@/actions/operaciones";
import { useRun } from "@/components/controls";
import { Field, Panel } from "@/components/ui";

export function CrearConteo({ bodegas, familias, hoy }: { bodegas: { v: string; l: string }[]; familias: { v: string; l: string }[]; hoy: string }) {
  const router = useRouter();
  const [f, setF] = useState({ bod: bodegas[0]?.v ?? "BC", fam: "", fecha: hoy });
  const { pending, error, run } = useRun();
  return (
    <Panel title="Crear conteo">
      <form className="grid items-end gap-4 p-4 sm:grid-cols-3 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto]" onSubmit={(e) => {
        e.preventDefault();
        run(() => crearConteoAction(f), (r) => router.push(`/toma-inventario/${(r as unknown as { id: string }).id}`));
      }}>
        <Field label="Bodega" htmlFor="c-bod"><select id="c-bod" className="input" value={f.bod} onChange={(e) => setF({ ...f, bod: e.target.value })}>{bodegas.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select></Field>
        <Field label="Familia (opcional)" htmlFor="c-fam"><select id="c-fam" className="input" value={f.fam} onChange={(e) => setF({ ...f, fam: e.target.value })}><option value="">Todas las familias</option>{familias.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select></Field>
        <Field label="Fecha (dd/mm/aaaa)" htmlFor="c-fecha" error={error || undefined}><input id="c-fecha" className="input" inputMode="numeric" maxLength={10} value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} /></Field>
        <button type="submit" className="btn btn-primary" disabled={pending}><Plus size={14} aria-hidden /> {pending ? "Creando…" : "Crear conteo"}</button>
      </form>
    </Panel>
  );
}
