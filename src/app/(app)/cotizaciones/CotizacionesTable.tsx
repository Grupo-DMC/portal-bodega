"use client";

import { useState } from "react";
import Link from "next/link";
import { Progress, StatusBadge, Empty } from "@/components/ui";

export type CotRow = {
  id: string; cli: string; rut: string; eje: string; aprob: string; vence: string; pct: number; estado: string;
  pendItems: number; open: boolean; dTxt: string; dAlert: boolean;
};

export function CotizacionesTable({ rows, canAct }: { rows: CotRow[]; canAct: boolean }) {
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const ids = rows.filter((r) => sel[r.id]).map((r) => r.id);
  const items = rows.filter((r) => sel[r.id]).reduce((a, r) => a + r.pendItems, 0);
  const allSel = rows.length > 0 && rows.every((r) => sel[r.id]);

  return (
    <>
      {ids.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-ink px-4 py-3 text-white" role="status">
          <span className="text-[13px]"><b>{ids.length} seleccionadas</b> · {items} ítems pendientes en total</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setSel({})} className="btn btn-sm !border-white/40 !text-white hover:!bg-white/10">Quitar selección</button>
            {canAct && <Link href={`/despachar/${ids[0]}`} className="btn btn-primary btn-sm no-underline">Revisar {ids[0]} →</Link>}
          </div>
        </div>
      )}
      <section className="panel" aria-label="Cotizaciones">
        <div className="table-wrap">
          <table className="tbl min-w-[960px]">
            <thead>
              <tr>
                <th className="w-10">
                  <input type="checkbox" aria-label="Seleccionar todas" checked={allSel} onChange={() => setSel(allSel ? {} : Object.fromEntries(rows.map((r) => [r.id, true])))} />
                </th>
                <th>N° COT</th><th>Cliente</th><th>Ejecutivo</th><th>Fecha aprobación</th><th>Vence reserva</th><th className="w-[180px]">% despachado</th><th>Estado</th><th />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className={sel[c.id] ? "[&>td]:!bg-a100" : ""}>
                  <td><input type="checkbox" aria-label={`Seleccionar ${c.id}`} checked={!!sel[c.id]} onChange={() => setSel((s) => ({ ...s, [c.id]: !s[c.id] }))} /></td>
                  <td className="font-extrabold">{c.id}</td>
                  <td><div className="font-semibold">{c.cli}</div><div className="text-[11px] text-muted">RUT {c.rut}</div></td>
                  <td>{c.eje}</td>
                  <td>{c.aprob}</td>
                  <td><div>{c.vence}</div><div className={`text-[11px] font-bold ${c.dAlert ? "text-a700" : "text-muted"}`}>{c.dTxt}</div></td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="flex-1"><Progress pct={c.pct} tone={c.pct === 100 ? "ok" : "accent"} /></div>
                      <span className="min-w-[34px] text-right text-xs font-bold tabular-nums">{c.pct}%</span>
                    </div>
                  </td>
                  <td><StatusBadge estado={c.estado} /></td>
                  <td className="text-right">
                    {c.open && canAct ? (
                      <Link href={`/despachar/${c.id}`} className="btn btn-primary btn-sm no-underline">Despachar</Link>
                    ) : (
                      <Link href={`/despachar/${c.id}`} className="btn btn-outline btn-sm no-underline">Ver</Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <Empty>No hay cotizaciones para los filtros elegidos.</Empty>}
      </section>
    </>
  );
}
