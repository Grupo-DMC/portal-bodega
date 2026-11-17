import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { ExpandRows } from "@/components/controls";
import { FilterBar } from "@/components/FilterBar";
import { Empty, PageHead, SemBadge } from "@/components/ui";
import { BODEGAS } from "@/lib/domain";
import { fmt, fmtDate } from "@/lib/format";
import type { SP } from "@/lib/params";
import { requireSession } from "@/server/auth";
import { getConfig, listBodegas, listFamilias, listSubfamilias, nombreBodega, nombreFamilia, nombreSubfamilia } from "@/server/inventory";
import { parseInvFilters, queryInventario } from "@/server/queries";

export const metadata: Metadata = { title: "Inventario" };

export default async function InventarioPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireSession();
  const f = parseInvFilters(await searchParams);
  const list = queryInventario(f);
  const sum = (k: "disp" | "res" | "libre" | "rev" | "trans") => fmt(list.reduce((a, x) => a + x.t[k], 0));
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();

  return (
    <div className="flex flex-col gap-6">
      <PageHead
        kicker="Control · Stock sumado de todas las bodegas"
        title="Inventario"
        actions={<a href={`/api/export/inventario${qs ? `?${qs}` : ""}`} className="btn btn-outline no-underline"><Download size={16} aria-hidden /> Descargar CSV</a>}
      />

      <FilterBar
        className="sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]"
        fields={[
          { name: "q", label: "Buscar", type: "text", placeholder: "Código o descripción" },
          { name: "fam", label: "Familia", type: "select", allLabel: "Todas", options: listFamilias().filter((x) => x.activo && x.cod !== "SRV").map((x) => ({ v: x.cod, l: x.nombre })) },
          { name: "sub", label: "Subfamilia", type: "select", allLabel: "Todas", options: listSubfamilias().filter((s) => s.activo && s.fam !== "SRV" && (!f.fam || s.fam === f.fam)).map((s) => ({ v: s.cod, l: s.nombre })) },
          { name: "bod", label: "Bodega", type: "select", allLabel: "Todas las bodegas", options: listBodegas().map((b) => ({ v: b.cod, l: b.nombre })) },
          { name: "sem", label: "Semáforo", type: "select", options: [{ v: "rojo", l: "Rojo · bajo crítico" }, { v: "amarillo", l: "Amarillo · cerca del crítico" }, { v: "verde", l: "Verde · sobre el crítico" }] },
        ]}
      />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-n700">
        <span><b className="text-ink">{list.length}</b> productos inventariables</span>
        <span>Libre = Disponible − Reservado</span>
        <span>Amarillo: entre el crítico y crítico + {getConfig().margen}</span>
      </div>

      <section className="panel" aria-label="Inventario">
        <div className="table-wrap">
          <table className="tbl min-w-[1100px]">
            <thead>
              <tr><th className="w-8" /><th>Código</th><th>Descripción</th><th>Familia</th><th>Subfamilia</th><th className="r">Disponible</th><th className="r">Reservado</th><th className="r">Libre</th><th className="r">En revisión</th><th className="r">En tránsito</th><th className="r">Crítico</th><th>Semáforo</th></tr>
            </thead>
            <tbody>
              {list.map(({ p, t }) => (
                <ExpandRows
                  key={p.cod}
                  label={p.cod}
                  colSpan={11}
                  cells={
                    <>
                      <td className="whitespace-nowrap font-bold">{p.cod}</td>
                      <td>{p.desc}</td>
                      <td className="text-n700">{nombreFamilia(p.fam)}</td>
                      <td className="text-n700">{p.sub ? nombreSubfamilia(p.sub) : "—"}</td>
                      <td className="r font-bold">{fmt(t.disp)}</td>
                      <td className="r">{fmt(t.res)}</td>
                      <td className={`r font-semibold ${t.libre < 0 ? "text-a700" : ""}`}>{fmt(t.libre)}</td>
                      <td className="r text-n700">{t.rev ? fmt(t.rev) : "—"}</td>
                      <td className="r text-n700">{t.trans ? fmt(t.trans) : "—"}</td>
                      <td className="r text-n700">{fmt(p.crit)}</td>
                      <td><SemBadge sem={t.sem} /></td>
                    </>
                  }
                  detail={
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
                      <table className="min-w-[560px] border-collapse border border-n300 bg-white text-xs">
                        <thead><tr className="bg-n200 text-[10px] uppercase tracking-[0.12em]"><th className="!bg-n200 px-3 py-1.5 text-left">Bodega</th><th className="!bg-n200 px-3 py-1.5 text-right">Disponible</th><th className="!bg-n200 px-3 py-1.5 text-right">En revisión</th><th className="!bg-n200 px-3 py-1.5 text-right">Dañado</th><th className="!bg-n200 px-3 py-1.5 text-right">Total físico</th></tr></thead>
                        <tbody>
                          {BODEGAS.map((b) => {
                            const s = p.stock[b];
                            return (
                              <tr key={b} className="border-t border-n200 tabular-nums">
                                <td className="px-3 py-[7px] font-semibold">{nombreBodega(b)}</td>
                                <td className="px-3 py-[7px] text-right">{fmt(s.disp)}</td><td className="px-3 py-[7px] text-right">{fmt(s.rev)}</td><td className="px-3 py-[7px] text-right">{fmt(s.dan)}</td>
                                <td className="px-3 py-[7px] text-right font-bold">{fmt(s.disp + s.rev + s.dan)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <div className="flex flex-col gap-2 text-xs text-n700">
                        <span>Unidad: <b className="text-ink">{p.um}</b> · Formato: <b className="text-ink">{p.formato || "—"}</b></span>
                        <span>Último ingreso: <b className="text-ink">{fmtDate(p.ult)}</b></span>
                        <div className="mt-1 flex gap-2">
                          <Link href={`/productos/${encodeURIComponent(p.cod)}`} className="btn btn-outline btn-sm no-underline">Ver ficha</Link>
                          <Link href={`/movimientos?cod=${encodeURIComponent(p.cod)}`} className="btn btn-ghost btn-sm no-underline">Movimientos →</Link>
                        </div>
                      </div>
                    </div>
                  }
                />
              ))}
            </tbody>
            <tfoot>
              <tr><td /><td colSpan={4} className="!text-[11px] uppercase tracking-[0.14em]">Totales ({list.length} productos)</td><td className="r font-extrabold">{sum("disp")}</td><td className="r">{sum("res")}</td><td className="r">{sum("libre")}</td><td className="r">{sum("rev")}</td><td className="r">{sum("trans")}</td><td colSpan={2} /></tr>
            </tfoot>
          </table>
        </div>
        {!list.length && <Empty>No hay productos que coincidan con los filtros.</Empty>}
      </section>
    </div>
  );
}
