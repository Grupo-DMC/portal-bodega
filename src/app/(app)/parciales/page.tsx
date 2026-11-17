import type { Metadata } from "next";
import Link from "next/link";
import { ExpandRows } from "@/components/controls";
import { Empty, PageHead, Progress } from "@/components/ui";
import { cotInfo } from "@/lib/domain";
import { daysFromToday, fmt, fmtDate } from "@/lib/format";
import { can } from "@/lib/rbac";
import { requireSession } from "@/server/auth";
import { getProducto, listCotizaciones, listDespachos, productMap } from "@/server/inventory";
import { CerrarSaldo } from "./CerrarSaldo";

export const metadata: Metadata = { title: "Despachos parciales" };

export default async function ParcialesPage() {
  const user = await requireSession();
  const operate = can(user.rol, "operar");
  const approve = can(user.rol, "aprobar");
  const pm = productMap();
  const list = listCotizaciones().filter((c) => c.estado === "Parcial");
  const despachos = listDespachos();

  return (
    <div className="flex flex-col gap-6">
      <PageHead kicker="Operación · Cotizaciones con saldo pendiente" title="Despachos parciales" />
      <section className="panel" aria-label="Cotizaciones con saldo">
        <div className="table-wrap">
          <table className="tbl min-w-[900px]">
            <thead><tr><th className="w-8" /><th>N° COT</th><th>Cliente</th><th className="w-[220px]">Progreso</th><th>Último despacho</th><th>Días sin movimiento</th><th className="r">Acciones</th></tr></thead>
            <tbody>
              {list.map((c) => {
                const i = cotInfo(c, pm);
                const hist = despachos.filter((d) => d.cot === c.id);
                const last = hist[0];
                const dd = last ? -daysFromToday(last.fecha) : null;
                const pendTxt = c.items.filter((it) => pm.get(it.cod)?.inv && it.cant > it.desp).map((it) => `${fmt(it.cant - it.desp)} ${it.cod}`).join(", ");
                return (
                  <ExpandRows
                    key={c.id}
                    label={c.id}
                    colSpan={6}
                    cells={
                      <>
                        <td className="font-extrabold">{c.id}</td>
                        <td><div className="font-semibold">{c.cli}</div><div className="text-[11px] text-muted">{c.eje} · vence {fmtDate(c.vence)}</div></td>
                        <td>
                          <div className="flex items-center gap-2"><div className="flex-1"><Progress pct={i.pct} /></div><span className="text-xs font-bold tabular-nums">{i.pct}%</span></div>
                          <div className="mt-[3px] text-[11px] text-muted">{i.pendItems} productos con saldo</div>
                        </td>
                        <td>{last ? `${fmtDate(last.fecha)} · Guía ${last.guia || "—"}` : "—"}</td>
                        <td><span className={`font-bold ${dd !== null && dd >= 5 ? "text-a700" : ""}`}>{dd === null ? "—" : dd === 0 ? "Hoy" : `${dd} días`}</span></td>
                        <td className="whitespace-nowrap text-right">
                          <div className="inline-flex gap-2">
                            {operate && <Link href={`/despachar/${c.id}`} className="btn btn-primary btn-sm no-underline">Continuar despacho</Link>}
                            {approve && <CerrarSaldo id={c.id} pendiente={pendTxt} />}
                          </div>
                        </td>
                      </>
                    }
                    detail={
                      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                        <div className="border border-n300 bg-white">
                          <div className="bg-n200 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em]">Detalle por producto</div>
                          <table className="w-full border-collapse text-xs">
                            <thead><tr className="text-[10px] uppercase tracking-[0.1em] text-muted"><th className="px-3 py-1.5 text-left font-normal">Producto</th><th className="px-3 py-1.5 text-right font-normal">Cotizado</th><th className="px-3 py-1.5 text-right font-normal">Despachado</th><th className="px-3 py-1.5 text-right font-normal">Pendiente</th></tr></thead>
                            <tbody>
                              {c.items.map((it) => {
                                const p = getProducto(it.cod);
                                const pe = it.cant - it.desp;
                                return (
                                  <tr key={it.cod} className={`border-t border-n200 ${p?.inv ? "" : "text-n500"}`}>
                                    <td className="px-3 py-[7px]"><b>{it.cod}</b> {p?.desc}</td>
                                    <td className="px-3 py-[7px] text-right tabular-nums">{fmt(it.cant)}</td>
                                    <td className="px-3 py-[7px] text-right tabular-nums">{p?.inv ? fmt(it.desp) : "—"}</td>
                                    <td className={`px-3 py-[7px] text-right font-extrabold tabular-nums ${pe > 0 && p?.inv ? "text-a700" : "text-muted"}`}>{p?.inv ? fmt(pe) : "No inventariable"}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <div className="border border-n300 bg-white">
                          <div className="bg-n200 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em]">Historial de despachos</div>
                          {hist.map((h) => (
                            <div key={h.id} className="border-t border-n200 px-3 py-2.5 text-xs">
                              <div className="flex justify-between"><b>{fmtDate(h.fecha)} · {h.hora}</b><span className="text-muted">{h.user}</span></div>
                              <div className="text-n700">{[h.guia && `Guía ${h.guia}`, h.oc && `OC ${h.oc}`, h.hep].filter(Boolean).join(" · ")}</div>
                              <div>{h.lines.map((l) => `${fmt(l.cant)} × ${l.cod}`).join(", ")}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    }
                  />
                );
              })}
            </tbody>
          </table>
        </div>
        {!list.length && <Empty>No hay despachos parciales abiertos.</Empty>}
      </section>
    </div>
  );
}
