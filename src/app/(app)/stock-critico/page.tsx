import type { Metadata } from "next";
import Link from "next/link";
import { Empty, PageHead, SemBadge, StatusBadge } from "@/components/ui";
import { SEM_META } from "@/lib/domain";
import { fmt, fmtDate, fmtS } from "@/lib/format";
import { requireSession } from "@/server/auth";
import { alertasEnviadas, getConfig, listProductos, totalesDe } from "@/server/inventory";

export const metadata: Metadata = { title: "Stock crítico" };

export default async function StockCriticoPage() {
  await requireSession();
  const cfg = getConfig();
  const sent = alertasEnviadas();
  const list = listProductos()
    .filter((p) => p.inv && p.activo)
    .map((p) => ({ p, t: totalesDe(p) }))
    .filter((x) => x.t.sem !== "verde")
    .sort((a, b) => SEM_META[a.t.sem].ord - SEM_META[b.t.sem].ord || (a.t.disp - a.p.crit) / (a.p.crit || 1) - (b.t.disp - b.p.crit) / (b.p.crit || 1));
  const nRed = list.filter((x) => x.t.sem === "rojo").length;
  const nYel = list.filter((x) => x.t.sem === "amarillo").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHead
        kicker="Control · Ordenado por gravedad"
        title="Stock crítico"
        actions={
          <div className="flex gap-6 text-[13px]">
            <span><b className="text-2xl text-bad-fg tabular-nums">{nRed}</b> bajo crítico</span>
            <span><b className="text-2xl text-warn-fg tabular-nums">{nYel}</b> cerca del crítico</span>
          </div>
        }
      />
      <section className="panel" aria-label="Productos con stock crítico">
        <div className="table-wrap">
          <table className="tbl min-w-[1000px]">
            <thead><tr><th>Semáforo</th><th>Código</th><th>Descripción</th><th className="r">Saldo</th><th className="r">Crítico</th><th className="r">Diferencia</th><th className="r">Reservado</th><th className="r">En tránsito</th><th>Último ingreso</th><th>Alerta por correo</th></tr></thead>
            <tbody>
              {list.map(({ p, t }) => {
                const dif = t.disp - p.crit;
                const s = sent[p.cod];
                const amarilloOff = t.sem === "amarillo" && !cfg.amarillo;
                return (
                  <tr key={p.cod}>
                    <td><SemBadge sem={t.sem} /></td>
                    <td className="font-bold"><Link href={`/productos/${encodeURIComponent(p.cod)}`} className="!text-ink">{p.cod}</Link></td>
                    <td>{p.desc}</td>
                    <td className="r font-extrabold">{fmt(t.disp)}</td>
                    <td className="r">{fmt(p.crit)}</td>
                    <td className={`r font-bold ${dif < 0 ? "text-bad-fg" : "text-warn-fg"}`}>{fmtS(dif)}</td>
                    <td className="r">{fmt(t.res)}</td>
                    <td className="r">{t.trans ? fmt(t.trans) : "—"}</td>
                    <td>{fmtDate(p.ult)}</td>
                    <td>
                      <StatusBadge estado={s ? "Enviada" : "No enviada"} />
                      <div className="mt-0.5 text-[11px] text-muted">{s ? s.replace(/^(\d{4})-(\d{2})-(\d{2})/, "$3/$2/$1") : amarilloOff ? "Alertas en amarillo desactivadas" : `Próximo resumen · ${cfg.hora}`}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!list.length && <Empty>Todo el inventario está sobre el crítico.</Empty>}
      </section>
    </div>
  );
}
