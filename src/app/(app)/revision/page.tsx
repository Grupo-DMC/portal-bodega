import type { Metadata } from "next";
import { Empty, PageHead } from "@/components/ui";
import { daysFromToday, fmt, fmtDate } from "@/lib/format";
import { can } from "@/lib/rbac";
import { requireSession } from "@/server/auth";
import { getProducto, listBodegas, listRevision } from "@/server/inventory";
import { RevisionList, type RevisionItem } from "./RevisionCard";

export const metadata: Metadata = { title: "Revisión de devoluciones" };

export default async function RevisionPage() {
  const user = await requireSession();
  const bodegas = listBodegas().map((b) => ({ v: b.cod, l: b.nombre }));
  const items: RevisionItem[] = listRevision().map((r) => {
    const p = getProducto(r.cod);
    const d = -daysFromToday(r.fecha);
    return {
      id: r.id, cod: r.cod, desc: p?.desc ?? "", um: p?.um ?? "UN", cant: r.cant, cantF: fmt(r.cant), cli: r.cli, guia: r.guia, fecha: fmtDate(r.fecha), motivo: r.motivo,
      dias: d === 0 ? "hoy" : `${d} ${d === 1 ? "día" : "días"}`,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHead kicker="Operación · Devoluciones en revisión" title="Revisión de devoluciones" />
      <div className="flex flex-col gap-4">
        <RevisionList items={items} bodegas={bodegas} canAct={can(user.rol, "operar")} />
        {!items.length && <div className="border border-n300 bg-white"><Empty>No hay ítems en revisión.</Empty></div>}
      </div>
    </div>
  );
}
