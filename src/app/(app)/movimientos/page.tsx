import type { Metadata } from "next";
import { Download } from "lucide-react";
import { FilterBar } from "@/components/FilterBar";
import { PageHead } from "@/components/ui";
import { TIPOS_MOV } from "@/lib/domain";
import { fmt, fmtDate, fmtS } from "@/lib/format";
import type { SP } from "@/lib/params";
import { requireSession } from "@/server/auth";
import { getProducto, listBodegas, listMovimientos, nombreBodega, nombreFamilia, nombreSubfamilia } from "@/server/inventory";
import { parseMovFilters, queryMovimientos } from "@/server/queries";
import { MovimientosTable, type MovRow } from "./MovimientosTable";

export const metadata: Metadata = { title: "Movimientos" };

export default async function MovimientosPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireSession();
  const f = parseMovFilters(await searchParams);
  const list = queryMovimientos(f);
  const all = listMovimientos();
  const uniq = (a: string[]) => [...new Set(a.filter(Boolean))].sort().map((v) => ({ v, l: v }));
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();

  const rows: MovRow[] = list.map((m) => {
    const p = getProducto(m.cod);
    return {
      id: m.id, fecha: fmtDate(m.fecha), hora: m.hora, tipo: m.tipo, cod: m.cod, desc: p?.desc ?? "", um: p?.um ?? "", positive: m.cant > 0,
      cant: fmtS(m.cant), bod: nombreBodega(m.bod), doc: m.doc || "—", cot: m.cot || "—", cli: m.cli || "—", motivo: m.motivo || "—", user: m.user, saldo: fmt(m.saldo),
      fam: p ? nombreFamilia(p.fam) + (p.sub ? ` / ${nombreSubfamilia(p.sub)}` : "") : "—",
      estadoStock: m.tipo === "Devolución" ? "En revisión (no suma a disponible)" : m.tipo === "Cambio de estado" ? m.motivo : "Disponible",
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHead
        kicker="Control · Kardex"
        title="Movimientos"
        actions={<a href={`/api/export/movimientos${qs ? `?${qs}` : ""}`} className="btn btn-outline no-underline"><Download size={16} aria-hidden /> Exportar CSV</a>}
      />
      <div className="border border-n300 bg-white p-4">
        <FilterBar
          className="grid-cols-2 sm:grid-cols-4 lg:grid-cols-8"
          fields={[
            { name: "cod", label: "Producto", type: "text", placeholder: "Código o descripción", span: "col-span-2" },
            { name: "tipo", label: "Tipo", type: "select", options: TIPOS_MOV.map((t) => ({ v: t, l: t })) },
            { name: "user", label: "Usuario", type: "select", options: uniq(all.map((m) => m.user)) },
            { name: "cli", label: "Cliente", type: "select", options: uniq(all.map((m) => m.cli)) },
            { name: "cot", label: "N° COT", type: "text", placeholder: "COT…", maxLength: 20 },
            { name: "bod", label: "Bodega", type: "select", allLabel: "Todas", options: listBodegas().map((b) => ({ v: b.cod, l: b.nombre })) },
            { name: "rango", label: "Rango", type: "select", allLabel: "Todo", options: [{ v: "0", l: "Hoy" }, { v: "7", l: "Últimos 7 días" }, { v: "30", l: "Últimos 30 días" }] },
          ]}
        />
      </div>
      <MovimientosTable rows={rows} nIn={list.filter((m) => m.cant > 0).length} nOut={list.filter((m) => m.cant < 0).length} />
    </div>
  );
}
