import type { Metadata } from "next";
import { FilterBar } from "@/components/FilterBar";
import { PageHead } from "@/components/ui";
import { cotInfo, isOpenCot } from "@/lib/domain";
import { daysFromToday, fmtDate } from "@/lib/format";
import { oneOf, pick, type SP } from "@/lib/params";
import { can } from "@/lib/rbac";
import { requireSession } from "@/server/auth";
import { listCotizaciones, productMap } from "@/server/inventory";
import { CotizacionesTable, type CotRow } from "./CotizacionesTable";

export const metadata: Metadata = { title: "Cotizaciones aprobadas" };

const ESTADOS = ["Pendiente", "Parcial", "Completa", "Vencida", "Cerrada"] as const;

export default async function CotizacionesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireSession();
  const sp = await searchParams;
  const all = listCotizaciones();
  const f = {
    estado: oneOf(pick(sp, "estado", 12), ESTADOS),
    cli: pick(sp, "cli", 120),
    eje: pick(sp, "eje", 80),
    rango: oneOf(pick(sp, "rango", 3), ["7", "30"] as const),
    vence: oneOf(pick(sp, "vence", 2), ["7", "v"] as const),
  };
  const pm = productMap();
  const list = all.filter((c) => {
    const d = daysFromToday(c.vence);
    return (
      (!f.estado || c.estado === f.estado) && (!f.cli || c.cli === f.cli) && (!f.eje || c.eje === f.eje) &&
      (!f.rango || -daysFromToday(c.aprob) <= Number(f.rango)) &&
      (!f.vence || (f.vence === "v" ? d < 0 : d >= 0 && d <= 7))
    );
  });
  const rows: CotRow[] = list.map((c) => {
    const i = cotInfo(c, pm);
    const open = isOpenCot(c);
    const d = daysFromToday(c.vence);
    return {
      id: c.id, cli: c.cli, rut: c.rut, eje: c.eje, aprob: fmtDate(c.aprob), vence: fmtDate(c.vence), pct: i.pct, estado: c.estado, pendItems: i.pendItems, open,
      dTxt: !open ? "—" : d < 0 ? `Vencida hace ${-d} d` : d === 0 ? "Vence hoy" : `Quedan ${d} días`, dAlert: open && d <= 7,
    };
  });
  const uniq = (a: string[]) => [...new Set(a)].sort().map((v) => ({ v, l: v }));

  return (
    <div className="flex flex-col gap-6">
      <PageHead kicker="Operación · Desde DMC Sistema" title="Cotizaciones aprobadas" />
      <div className="border border-n300 bg-white p-4">
        <FilterBar
          className="sm:grid-cols-2 lg:grid-cols-5"
          fields={[
            { name: "estado", label: "Estado", type: "select", options: ESTADOS.map((e) => ({ v: e, l: e })) },
            { name: "cli", label: "Cliente", type: "select", options: uniq(all.map((c) => c.cli)) },
            { name: "eje", label: "Ejecutivo", type: "select", options: uniq(all.map((c) => c.eje)) },
            { name: "rango", label: "Aprobación", type: "select", allLabel: "Cualquier fecha", options: [{ v: "7", l: "Últimos 7 días" }, { v: "30", l: "Últimos 30 días" }] },
            { name: "vence", label: "Vencimiento reserva", type: "select", options: [{ v: "7", l: "Vence en ≤ 7 días" }, { v: "v", l: "Vencidas" }] },
          ]}
        />
      </div>
      <CotizacionesTable rows={rows} canAct={can(user.rol, "operar")} />
    </div>
  );
}
