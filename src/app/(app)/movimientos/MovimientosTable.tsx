"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Dialog } from "@/components/Dialog";
import { Empty } from "@/components/ui";

export type MovRow = {
  id: number; fecha: string; hora: string; tipo: string; cod: string; desc: string; um: string; positive: boolean; cant: string; bod: string;
  doc: string; cot: string; cli: string; motivo: string; user: string; saldo: string; fam: string; estadoStock: string;
};

export function MovimientosTable({ rows, nIn, nOut }: { rows: MovRow[]; nIn: number; nOut: number }) {
  const [sel, setSel] = useState<MovRow | null>(null);
  const tone = (m: MovRow) => (m.positive ? "text-ok-fg" : "text-a700");

  return (
    <>
      <div className="text-xs text-n700">
        <b className="text-ink">{rows.length}</b> movimientos · Entradas <b className="text-ok-fg">{nIn}</b> · Salidas <b className="text-a700">{nOut}</b>
      </div>
      <section className="panel" aria-label="Kardex de movimientos">
        <div className="table-wrap">
          <table className="tbl min-w-[1300px] !text-[12.5px]">
            <thead><tr><th>Fecha</th><th>Hora</th><th>Tipo</th><th>Producto</th><th className="r">Cantidad</th><th>Bodega</th><th>Documento</th><th>N° COT</th><th>Cliente</th><th>Motivo</th><th>Usuario</th><th className="r">Saldo</th></tr></thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="cursor-pointer" onClick={() => setSel(m)}>
                  <td className="whitespace-nowrap">
                    <button type="button" onClick={(e) => { e.stopPropagation(); setSel(m); }} className="cursor-pointer border-0 bg-transparent p-0 text-left text-inherit underline-offset-4 hover:underline" aria-label={`Ver detalle del movimiento de ${m.cod} del ${m.fecha} ${m.hora}`}>{m.fecha}</button>
                  </td>
                  <td className="text-muted">{m.hora}</td>
                  <td className="whitespace-nowrap"><span className="border border-n400 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.05em]">{m.tipo}</span></td>
                  <td className="whitespace-nowrap font-bold">{m.cod}</td>
                  <td className={`r whitespace-nowrap font-extrabold ${tone(m)}`}>{m.cant}</td>
                  <td className="whitespace-nowrap">{m.bod}</td>
                  <td className="text-n700">{m.doc}</td>
                  <td className="whitespace-nowrap">{m.cot}</td>
                  <td>{m.cli}</td>
                  <td className="text-n700">{m.motivo}</td>
                  <td className="whitespace-nowrap">{m.user}</td>
                  <td className="r font-semibold">{m.saldo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <Empty>Sin movimientos para los filtros elegidos.</Empty>}
      </section>

      {sel && (
        <Dialog variant="right" label={`Detalle del movimiento ${sel.tipo} de ${sel.cod}`} onClose={() => setSel(null)} className={sel.positive ? "!border-ok-dot" : "!border-a700"}>
          <div className="flex items-start justify-between border-b border-n300 px-6 py-5">
            <div>
              <div className="kicker mb-1.5">{sel.tipo}</div>
              <div className={`text-[40px] font-extrabold leading-none tracking-[-0.04em] tabular-nums ${tone(sel)}`}>{sel.cant} {sel.um}</div>
              <div className="mt-1.5 text-sm"><b>{sel.cod}</b> · {sel.desc}</div>
            </div>
            <button type="button" onClick={() => setSel(null)} aria-label="Cerrar" className="btn btn-outline btn-icon"><X size={18} aria-hidden /></button>
          </div>
          <dl className="m-0 min-h-0 flex-1 overflow-y-auto px-6 py-2">
            {([["Fecha y hora", `${sel.fecha} · ${sel.hora}`], ["Bodega", sel.bod], ["Documento", sel.doc], ["N° cotización", sel.cot], ["Cliente", sel.cli], ["Motivo", sel.motivo], ["Usuario", sel.user], ["Estado de stock", sel.estadoStock], ["Saldo resultante", `${sel.saldo} ${sel.um}`], ["Familia", sel.fam]] as const).map(([k, v]) => (
              <div key={k} className="grid grid-cols-[130px_minmax(0,1fr)] gap-3 border-b border-n200 py-2.5 text-[13px]">
                <dt className="pt-0.5 text-[10px] uppercase tracking-[0.14em] text-muted">{k}</dt><dd className="m-0 font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-2 border-t-2 border-divider px-6 py-4">
            <Link href={`/productos/${encodeURIComponent(sel.cod)}`} className="btn btn-outline no-underline">Ver ficha del producto</Link>
            <Link href={`/movimientos?cod=${encodeURIComponent(sel.cod)}`} onClick={() => setSel(null)} className="btn btn-ghost no-underline">Filtrar por este producto</Link>
          </div>
        </Dialog>
      )}
    </>
  );
}
