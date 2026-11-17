import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Panel, SemBadge, StatusBadge } from "@/components/ui";
import { BODEGAS, reservasDe } from "@/lib/domain";
import { fmt, fmtDate, fmtS, todayISO } from "@/lib/format";
import { can } from "@/lib/rbac";
import { requireSession } from "@/server/auth";
import { getFoto, getProducto, listCotizaciones, listMovimientos, nombreBodega, nombreFamilia, nombreSubfamilia, totalesDe } from "@/server/inventory";

export async function generateMetadata({ params }: { params: Promise<{ cod: string }> }): Promise<Metadata> {
  return { title: `Ficha ${decodeURIComponent((await params).cod)}` };
}

export default async function FichaPage({ params }: { params: Promise<{ cod: string }> }) {
  const user = await requireSession();
  const cod = decodeURIComponent((await params).cod);
  const p = getProducto(cod);
  if (!p) notFound();
  const admin = can(user.rol, "maestros");
  const t = totalesDe(p);
  const rs = reservasDe(listCotizaciones(), p.cod);
  const movs = listMovimientos().filter((m) => m.cod === p.cod).slice(0, 20);
  const med = p.med;

  // Serie de demostración (determinística por código) hasta conectar SQL Server.
  let h = 0;
  for (const ch of p.cod) h = (h * 31 + ch.charCodeAt(0)) % 997;
  const base = Math.max(p.crit, 4);
  const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const mesActual = Number(todayISO().slice(5, 7)) - 1;
  const chart = Array.from({ length: 6 }, (_, k) => MESES[(mesActual - 5 + k + 12) % 12]).map((m, i) => ({
    m, i: Math.round((Math.abs(Math.sin(h + i * 1.3)) * 0.8 + 0.2) * base * 1.4), o: Math.round((Math.abs(Math.cos(h * 0.7 + i)) * 0.8 + 0.2) * base * 1.2),
  }));
  const mx = Math.max(...chart.map((v) => Math.max(v.i, v.o)), 1);

  const badges: { label: string; estado: string }[] = [{ label: p.activo ? "Activo" : "Inactivo", estado: p.activo ? "Activo" : "Inactivo" }];
  if (!p.inv) badges.push({ label: "No inventariable", estado: "No inventariable" });
  if (t.rev) badges.push({ label: `${fmt(t.rev)} en revisión`, estado: "En revisión" });
  if (t.dan) badges.push({ label: `${fmt(t.dan)} dañado`, estado: "Dañado" });
  if (p.inv && t.res > t.disp) badges.push({ label: "Sin cobertura", estado: "Sin cobertura" });

  const specs: [string, string][] = [
    ["Unidad base", p.um], ["Formato de venta", p.formato || "—"], ["Tipo de medida", med?.tipo ?? "—"],
    ["Largo × ancho × alto", med ? `${med.l ?? "—"} × ${med.a ?? "—"} × ${med.h ?? "—"} ${med.u}` : "—"],
    ["Peso", med?.peso ? `${String(med.peso).replace(".", ",")} ${med.pu}` : "—"], ["Último ingreso", fmtDate(p.ult)],
  ];
  const foto = !!getFoto(p.cod);
  const enc = encodeURIComponent(p.cod);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <Link href={admin ? "/productos" : "/inventario"} className="btn btn-ghost btn-ghost-ink no-underline !text-ink"><ArrowLeft size={14} aria-hidden /> {admin ? "Volver al maestro" : "Volver al inventario"}</Link>
        {admin && <Link href={`/productos/${enc}/editar`} className="btn btn-primary no-underline">Editar</Link>}
      </div>

      <section className="grid border border-n300 bg-white lg:grid-cols-[320px_minmax(0,1fr)_minmax(0,0.9fr)]" aria-label="Resumen del producto">
        <div className="grayscale-img grid h-[260px] place-items-center border-b border-n300 bg-n100 lg:border-b-0 lg:border-r">
          {foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/productos/${enc}/foto`} alt={`Foto de ${p.desc}`} className="h-full w-full object-contain" />
          ) : (
            <span className="text-[13px] text-muted">Sin foto</span>
          )}
        </div>
        <div className="flex flex-col gap-2.5 border-b border-n300 px-6 py-6 lg:border-b-0 lg:border-r lg:px-7">
          <div className="kicker">{nombreFamilia(p.fam)}{p.sub ? ` / ${nombreSubfamilia(p.sub)}` : ""}</div>
          <h1 className="text-[clamp(36px,6vw,52px)] leading-[0.95] tracking-[-0.04em]">{p.cod}</h1>
          <div className="text-xl font-semibold">{p.desc}</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">{badges.map((b) => <StatusBadge key={b.label} estado={b.estado} label={b.label} />)}</div>
        </div>
        <div className="flex flex-col justify-center gap-3 px-6 py-6 lg:px-7">
          {p.inv ? (
            <>
              <div className="kicker">Stock global disponible</div>
              <div className="flex items-baseline gap-2.5"><span className="text-[clamp(44px,7vw,64px)] font-extrabold leading-[0.9] tracking-[-0.05em] tabular-nums">{fmt(t.disp)}</span><span className="text-sm text-muted">{p.um}</span></div>
              <div className="flex flex-wrap items-center gap-3"><SemBadge sem={t.sem} size={13} /><span className="text-[13px] text-n700">Crítico {fmt(p.crit)} · Libre <b>{fmt(t.libre)}</b></span></div>
            </>
          ) : (
            <p className="text-sm text-n700">Producto no inventariable: se cotiza y se despacha como servicio, pero no aparece en inventario ni descuenta stock.</p>
          )}
        </div>
      </section>

      {p.inv && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Panel title="Desglose por bodega y estado">
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Bodega</th><th className="r">Disponible</th><th className="r">Reservado</th><th className="r">En revisión</th><th className="r">Dañado</th><th className="r">En tránsito</th></tr></thead>
                <tbody>
                  {BODEGAS.map((b) => (
                    <tr key={b}><td className="font-semibold">{nombreBodega(b)}</td><td className="r font-bold">{fmt(p.stock[b].disp)}</td><td className="r">—</td><td className="r">{fmt(p.stock[b].rev)}</td><td className="r">{fmt(p.stock[b].dan)}</td><td className="r">{b === "BTR" ? fmt(p.transito) : "—"}</td></tr>
                  ))}
                </tbody>
                <tfoot><tr><td>Total</td><td className="r font-extrabold">{fmt(t.disp)}</td><td className="r">{fmt(t.res)}</td><td className="r">{fmt(t.rev)}</td><td className="r">{fmt(t.dan)}</td><td className="r">{fmt(t.trans)}</td></tr></tfoot>
              </table>
            </div>
            <p className="px-4 py-2.5 text-[11px] text-muted">El reservado es global (por cotización) y el tránsito corresponde a compras en camino.</p>
          </Panel>
          <Panel
            title="Entradas y salidas · 6 meses"
            right={<span className="flex gap-3 text-[11px] font-normal normal-case tracking-[0.04em]"><span className="flex items-center gap-1.5"><span className="h-[9px] w-[9px] bg-ink" aria-hidden />Entradas</span><span className="flex items-center gap-1.5"><span className="h-[9px] w-[9px] bg-accent" aria-hidden />Salidas</span></span>}
            bodyClass="p-4"
          >
            <div role="img" aria-label="Gráfico de entradas y salidas de los últimos 6 meses (serie de demostración)" className="flex h-[150px] items-end gap-3.5 border-b-2 border-divider">
              {chart.map((c) => (
                <div key={c.m} title={`${c.m} · Entradas ${fmt(c.i)} · Salidas ${fmt(c.o)}`} className="flex h-full flex-1 items-end gap-[3px]">
                  <div className="flex-1 bg-ink" style={{ height: `${(c.i / mx) * 100}%` }} /><div className="flex-1 bg-accent" style={{ height: `${(c.o / mx) * 100}%` }} />
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex gap-3.5" aria-hidden>{chart.map((c) => <span key={c.m} className="flex-1 text-center text-[11px] text-muted">{c.m}</span>)}</div>
            <p className="mt-2 text-[11px] text-muted">Serie de demostración hasta conectar SQL Server.</p>
          </Panel>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {p.inv && (
          <Panel title="Reservas por cotización">
            {rs.map((r) => (
              <div key={r.cot} className="grid grid-cols-[100px_minmax(0,1fr)_auto] gap-3 border-b border-n200 px-4 py-2.5 text-[13px]">
                <b>{r.cot}</b><span>{r.cli} <span className={`text-xs ${r.dias <= 7 ? "text-a700" : "text-muted"}`}>· vence en {r.dias} días</span></span><b className="tabular-nums">{fmt(r.qty)} {p.um}</b>
              </div>
            ))}
            {!rs.length && <div className="p-4 text-[13px] text-muted">Sin reservas vigentes.</div>}
          </Panel>
        )}
        <Panel title="Medidas y formato">
          {specs.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[150px_minmax(0,1fr)] gap-3 border-b border-n200 px-4 py-[9px] text-[13px]">
              <span className="pt-0.5 text-[10px] uppercase tracking-[0.14em] text-muted">{k}</span><b>{v}</b>
            </div>
          ))}
        </Panel>
      </div>

      <Panel title="Historial de movimientos · últimos 20" right={<Link href={`/movimientos?cod=${enc}`} className="link-btn no-underline">Ver en Movimientos →</Link>}>
        <div className="table-wrap">
          <table className="tbl min-w-[800px] !text-[12.5px]">
            <thead><tr><th>Fecha</th><th>Tipo</th><th className="r">Cantidad</th><th>Bodega</th><th>Documento</th><th>N° COT</th><th>Usuario</th><th className="r">Saldo</th></tr></thead>
            <tbody>
              {movs.map((m) => (
                <tr key={m.id}><td>{fmtDate(m.fecha)} · {m.hora}</td><td>{m.tipo}</td><td className={`r font-extrabold ${m.cant > 0 ? "text-ok-fg" : "text-a700"}`}>{fmtS(m.cant)}</td><td>{nombreBodega(m.bod)}</td><td className="text-n700">{m.doc || "—"}</td><td>{m.cot || "—"}</td><td>{m.user}</td><td className="r">{fmt(m.saldo)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        {!movs.length && <div className="p-4 text-[13px] text-muted">Sin movimientos registrados.</div>}
      </Panel>
    </div>
  );
}
