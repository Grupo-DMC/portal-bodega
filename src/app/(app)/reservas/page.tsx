import type { Metadata } from "next";
import { ExpandRows } from "@/components/controls";
import { Empty, PageHead, Progress, StatusBadge } from "@/components/ui";
import { reservasDe } from "@/lib/domain";
import { fmt } from "@/lib/format";
import { requireSession } from "@/server/auth";
import { listCotizaciones, listProductos, totalesDe } from "@/server/inventory";

export const metadata: Metadata = { title: "Reservas" };

export default async function ReservasPage() {
  await requireSession();
  const cots = listCotizaciones();
  const rows = listProductos()
    .filter((p) => p.inv && p.activo)
    .map((p) => ({ p, t: totalesDe(p), rs: reservasDe(cots, p.cod) }))
    .filter((x) => x.rs.length)
    .sort((a, b) => b.t.res / Math.max(b.t.disp, 1) - a.t.res / Math.max(a.t.disp, 1));

  return (
    <div className="flex flex-col gap-6">
      <PageHead kicker="Control · Stock comprometido por cotizaciones aprobadas" title="Reservas" />
      <section className="panel" aria-label="Reservas por producto">
        <div className="table-wrap">
          <table className="tbl min-w-[860px]">
            <thead><tr><th className="w-8" /><th>Código</th><th>Descripción</th><th className="r">Total reservado</th><th className="r">N° cotizaciones</th><th className="r">Stock disponible</th><th className="r">Libre</th><th>Cobertura</th></tr></thead>
            <tbody>
              {rows.map(({ p, t, rs }) => (
                <ExpandRows
                  key={p.cod}
                  label={p.cod}
                  colSpan={7}
                  cells={
                    <>
                      <td className="font-bold">{p.cod}</td><td>{p.desc}</td>
                      <td className="r font-extrabold">{fmt(t.res)}</td><td className="r">{rs.length}</td><td className="r">{fmt(t.disp)}</td>
                      <td className={`r font-semibold ${t.libre < 0 ? "text-a700" : ""}`}>{fmt(t.libre)}</td>
                      <td><StatusBadge estado={t.res > t.disp ? "Sin cobertura" : "Cubierta"} /></td>
                    </>
                  }
                  detail={
                    <div className="flex flex-col border border-n300 bg-white">
                      {rs.map((r) => (
                        <div key={r.cot} className="grid items-center gap-x-3 gap-y-1 border-b border-n200 px-3.5 py-2.5 text-[12.5px] sm:grid-cols-[110px_minmax(0,1fr)_160px_140px_120px]">
                          <b>{r.cot}</b>
                          <span>{r.cli} <span className="text-muted">· {r.eje}</span></span>
                          <Progress pct={(r.qty / t.res) * 100} />
                          <b className="sm:text-right tabular-nums">{fmt(r.qty)} {p.um}</b>
                          <span className={`font-semibold ${r.dias <= 7 ? "text-a700" : "text-n700"}`}>vence en {r.dias} días</span>
                        </div>
                      ))}
                    </div>
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <Empty>No hay reservas vigentes.</Empty>}
      </section>
    </div>
  );
}
