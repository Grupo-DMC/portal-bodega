import type { Metadata } from "next";
import Link from "next/link";
import { cx, PageHead, Panel, SemBadge, StatusBadge } from "@/components/ui";
import { cotInfo, SEM_META, type Sem } from "@/lib/domain";
import { daysFromToday, fmt, fmtDate, fmtDateShort, todayISO, weekdayName } from "@/lib/format";
import { oneOf, pick, type SP } from "@/lib/params";
import { can } from "@/lib/rbac";
import { requireSession } from "@/server/auth";
import { actividadDiaria, getConfig, listCotizaciones, listMovimientos, listProductos, listRevision, nombreFamilia, productMap, TOP_DESPACHADOS, totalesDe } from "@/server/inventory";

export const metadata: Metadata = { title: "Dashboard" };

const FAM_COLOR: Record<string, string> = {
  ANT: "var(--color-accent)", ETQ: "var(--color-ink)", DES: "var(--color-n600)", CNT: "var(--color-n400)", MAT: "var(--color-a300)",
};
const VERB: Record<string, string> = {
  "Despacho cot": "despachó", "Entrada packing": "ingresó", "Salida manual": "registró salida de", "Ajuste conteo": "ajustó",
  Devolución: "recibió devolución de", "Cambio de estado": "cambió estado de",
};

export default async function Dashboard({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireSession();
  const sp = await searchParams;
  const N = Number(oneOf(pick(sp, "periodo", 3), ["7", "30", "90"] as const) || "30") as 7 | 30 | 90;
  const hoy = todayISO();
  const cfg = getConfig();
  const prodMap = productMap();
  const cots = listCotizaciones();
  const inv = listProductos().filter((p) => p.inv && p.activo).map((p) => ({ p, t: totalesDe(p) }));
  const rojo = inv.filter((x) => x.t.sem === "rojo").length;
  const amar = inv.filter((x) => x.t.sem === "amarillo").length;
  const movs = listMovimientos();
  const canOperate = can(user.rol, "operar");

  const kpis = [
    { label: "Productos activos", value: inv.length, sub: "inventariables", href: "/inventario", bar: "border-t-ink", color: "" },
    { label: "Bajo stock crítico", value: rojo, sub: "requieren reposición", href: "/stock-critico", bar: "border-t-bad-dot", color: "text-bad-fg" },
    { label: "Cerca del crítico", value: amar, sub: `margen ≤ ${cfg.margen} un.`, href: "/stock-critico", bar: "border-t-warn-dot", color: "text-warn-fg" },
    { label: "Cotizaciones aprobadas pendientes", value: cots.filter((c) => c.estado === "Pendiente").length, sub: "sin despacho", href: "/cotizaciones", bar: "border-t-accent", color: "" },
    { label: "Despachos parciales abiertos", value: cots.filter((c) => c.estado === "Parcial").length, sub: "con saldo pendiente", href: "/parciales", bar: "border-t-n400", color: "" },
    { label: "Ítems en revisión", value: listRevision().length, sub: "devoluciones", href: "/revision", bar: "border-t-n400", color: "" },
    { label: "Movimientos de hoy", value: movs.filter((m) => m.fecha === hoy).length, sub: fmtDate(hoy), href: "/movimientos", bar: "border-t-n400", color: "" },
  ];

  // Serie entradas vs salidas (en 90 días se agrupa de a 3 para mantener legible el gráfico).
  const raw = actividadDiaria(N);
  const agg = N === 90
    ? raw.reduce<typeof raw>((a, r, i) => { const k = Math.floor(i / 3); a[k] ??= { fecha: r.fecha, inn: 0, out: 0 }; a[k].inn += r.inn; a[k].out += r.out; return a; }, [])
    : raw;
  const max = Math.max(...agg.map((r) => Math.max(r.inn, r.out)), 1);
  const step = N === 7 ? 1 : 5;
  const sumIn = raw.reduce((a, r) => a + r.inn, 0);
  const sumOut = raw.reduce((a, r) => a + r.out, 0);

  const fams = Object.keys(FAM_COLOR).map((cod) => {
    const ps = inv.filter((x) => x.p.fam === cod && x.t.disp > 0);
    return { cod, name: nombreFamilia(cod), color: FAM_COLOR[cod], skus: ps.length, units: ps.reduce((a, x) => a + x.t.disp, 0) };
  });
  const skuTotal = fams.reduce((a, f) => a + f.skus, 0) || 1;
  let acc = 0;
  const donut = `conic-gradient(${fams.map((f) => { const a0 = acc; acc += (f.skus / skuTotal) * 360; return `${f.color} ${a0}deg ${acc}deg`; }).join(",")})`;

  const resRows = inv.filter((x) => x.t.res > 0)
    .sort((a, b) => b.t.res / Math.max(b.t.disp, 1) - a.t.res / Math.max(a.t.disp, 1)).slice(0, 6);
  const crit = inv.filter((x) => x.t.sem !== "verde")
    .sort((a, b) => SEM_META[a.t.sem].ord - SEM_META[b.t.sem].ord || (a.t.disp - a.p.crit) / (a.p.crit || 1) - (b.t.disp - b.p.crit) / (b.p.crit || 1));
  const porDespachar = cots.filter((c) => c.estado === "Pendiente" || c.estado === "Parcial").slice(0, 5);
  const topMax = TOP_DESPACHADOS[0][1];

  const mesActual = new Intl.DateTimeFormat("es-CL", { month: "long", timeZone: "America/Santiago" }).format(new Date(`${hoy}T12:00:00Z`));

  return (
    <div className="flex flex-col gap-6">
      <PageHead
        kicker={`Resumen operativo · ${weekdayName(hoy)} ${fmtDate(hoy)}`}
        title="Dashboard"
        actions={
          <nav className="flex items-center gap-3" aria-label="Periodo">
            <span className="text-[11px] uppercase tracking-[0.14em] text-muted">Periodo</span>
            <div className="flex border border-ink bg-white">
              {([7, 30, 90] as const).map((v) => (
                <Link key={v} href={v === 30 ? "/" : `/?periodo=${v}`} aria-current={N === v ? "true" : undefined} scroll={false}
                  className={cx("flex min-h-10 items-center border-r border-n300 px-3.5 text-xs font-semibold uppercase tracking-[0.08em] no-underline last:border-r-0", N === v ? "bg-ink !text-white" : "!text-ink hover:bg-n100")}>
                  {v} días
                </Link>
              ))}
            </div>
          </nav>
        }
      />

      <div className="grid grid-cols-2 border border-n300 bg-white sm:grid-cols-4 xl:grid-cols-7">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className={cx("flex flex-col gap-1.5 border-b border-r border-t-4 border-n300 bg-white p-4 !text-ink no-underline transition-colors duration-150 hover:bg-n100", k.bar)}>
            <span className="min-h-7 text-[10px] font-semibold uppercase leading-[1.35] tracking-[0.14em] text-n700">{k.label}</span>
            <span className={cx("text-[40px] font-extrabold leading-none tracking-[-0.04em] tabular-nums", k.color)}>{k.value}</span>
            <span className="text-xs text-muted">{k.sub}</span>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel
          title={`Entradas vs salidas · últimos ${N} días`}
          right={
            <span className="flex gap-4 text-[11px] font-normal normal-case tracking-[0.04em]">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-ink" aria-hidden />Entradas</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-accent" aria-hidden />Salidas</span>
            </span>
          }
          bodyClass="px-4 pb-3 pt-5"
        >
          <div className="mb-4 flex gap-4">
            <div><div className="text-[10px] uppercase tracking-[0.14em] text-muted">Movimientos de entrada</div><div className="text-2xl font-extrabold tracking-[-0.03em] tabular-nums">{sumIn}</div></div>
            <div className="w-px bg-n300" aria-hidden />
            <div><div className="text-[10px] uppercase tracking-[0.14em] text-muted">Movimientos de salida</div><div className="text-2xl font-extrabold tracking-[-0.03em] tabular-nums">{sumOut}</div></div>
          </div>
          <div role="img" aria-label={`Gráfico de barras: ${sumIn} entradas y ${sumOut} salidas en los últimos ${N} días. Serie de demostración.`}
            className="flex h-[200px] items-end gap-[3px] border-b-2 border-divider" style={{ backgroundImage: "linear-gradient(var(--color-n200) 1px,transparent 1px)", backgroundSize: "100% 50px" }}>
            {agg.map((d) => (
              <div key={d.fecha} title={`${fmtDateShort(d.fecha)} · Entradas ${d.inn} · Salidas ${d.out}`} className="flex h-full flex-1 items-end gap-px">
                <div className="flex-1 bg-ink" style={{ height: `${(d.inn / max) * 100}%` }} />
                <div className="flex-1 bg-accent" style={{ height: `${(d.out / max) * 100}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex gap-[3px]" aria-hidden>
            {agg.map((d, i) => <div key={d.fecha} className="flex-1 overflow-visible whitespace-nowrap text-[10px] text-muted">{i % step === 0 ? fmtDateShort(d.fecha) : ""}</div>)}
          </div>
          <p className="mt-2 text-[11px] text-muted">Serie de demostración hasta conectar SQL Server.</p>
        </Panel>

        <Panel title="Stock por familia" bodyClass="flex flex-col gap-5 p-4">
          <div className="flex items-center gap-5">
            <div className="grid h-[150px] w-[150px] flex-none place-items-center rounded-full" style={{ background: donut }} role="img" aria-label={`${skuTotal} SKU con stock, agrupados por familia`}>
              <div className="flex h-[92px] w-[92px] flex-col items-center justify-center rounded-full bg-white">
                <span className="text-[26px] font-extrabold leading-none tracking-[-0.03em]">{skuTotal}</span>
                <span className="text-[9px] uppercase tracking-[0.14em] text-muted">SKU</span>
              </div>
            </div>
            <p className="text-xs text-n700">Productos inventariables con stock disponible, agrupados por familia. En la leyenda, unidades totales.</p>
          </div>
          <ul className="m-0 flex list-none flex-col p-0">
            {fams.map((f) => (
              <li key={f.cod} className="grid grid-cols-[12px_1fr_auto_auto] items-center gap-2.5 border-t border-n200 py-[7px] text-[13px]">
                <span className="h-3 w-3" style={{ background: f.color }} aria-hidden />
                <span>{f.name}</span>
                <span className="text-muted tabular-nums">{fmt(f.units)} un.</span>
                <b className="min-w-9 text-right tabular-nums">{f.skus}</b>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={`Top 10 más despachados · ${mesActual}`} right={<span className="font-normal normal-case tracking-[0.04em] text-muted">N° de despachos</span>} bodyClass="flex flex-col gap-2 p-4">
          {TOP_DESPACHADOS.map(([cod, v], i) => (
            <div key={cod} className="grid grid-cols-[20px_84px_minmax(0,1fr)_36px] items-center gap-2.5 text-[13px]">
              <span className="text-[11px] text-muted">{i + 1}</span>
              <b className="truncate">{cod}</b>
              <div className="h-[18px] bg-n100"><div className={cx("h-full", i < 3 ? "bg-accent" : "bg-ink")} style={{ width: `${(v / topMax) * 100}%` }} /></div>
              <span className="text-right font-semibold tabular-nums">{v}</span>
            </div>
          ))}
        </Panel>

        <Panel
          title="Reservado vs disponible"
          right={
            <span className="flex gap-3.5 text-[11px] font-normal normal-case tracking-[0.04em]">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-accent" aria-hidden />Reservado</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-n300" aria-hidden />Libre</span>
            </span>
          }
          bodyClass="flex flex-col gap-3.5 p-4"
        >
          {resRows.map(({ p, t }) => {
            const m = Math.max(t.disp, t.res);
            const over = t.res > t.disp;
            return (
              <div key={p.cod} className="flex flex-col gap-[5px]">
                <div className="flex justify-between gap-3 text-[13px]">
                  <span className="min-w-0 truncate"><b>{p.cod}</b> <span className="text-muted">{p.desc}</span></span>
                  <span className={cx("flex-none font-semibold tabular-nums", over ? "text-a700" : "text-n700")}>{over ? `Sin cobertura · ${fmt(t.res)} / ${fmt(t.disp)}` : `${fmt(t.res)} / ${fmt(t.disp)}`}</span>
                </div>
                <div className="flex h-4 bg-n100">
                  <div className="bg-accent" style={{ width: `${(Math.min(t.res, m) / m) * 100}%` }} />
                  <div className="bg-n300" style={{ width: `${(Math.max(t.libre, 0) / m) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </Panel>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title="Stock crítico" right={<Link href="/stock-critico" className="link-btn no-underline">Ver todo →</Link>} className="lg:row-span-2">
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Código</th><th>Descripción</th><th className="r">Saldo</th><th className="r">Crítico</th><th>Semáforo</th></tr></thead>
              <tbody>
                {crit.map(({ p, t }) => (
                  <tr key={p.cod}>
                    <td className="font-bold"><Link href={`/productos/${encodeURIComponent(p.cod)}`} className="!text-ink">{p.cod}</Link></td>
                    <td>{p.desc}</td>
                    <td className="r font-semibold">{fmt(t.disp)}</td>
                    <td className="r text-muted">{fmt(p.crit)}</td>
                    <td><SemBadge sem={t.sem as Sem} /></td>
                  </tr>
                ))}
                {!crit.length && <tr><td colSpan={5} className="text-muted">Todo el inventario está sobre el crítico.</td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Aprobadas por despachar" right={<Link href="/cotizaciones" className="link-btn no-underline">Ver todo →</Link>}>
          {porDespachar.map((c) => (
            <div key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-n200 px-4 py-3">
              <div className="flex items-center gap-2"><b className="text-sm">{c.id}</b><StatusBadge estado={c.estado} /></div>
              {canOperate && <Link href={`/despachar/${c.id}`} className="btn btn-outline btn-sm row-span-2 no-underline">Despachar</Link>}
              <div className="text-xs text-n700">{c.cli} · vence en {daysFromToday(c.vence)} días · {cotInfo(c, prodMap).pct}% despachado</div>
            </div>
          ))}
          {!porDespachar.length && <div className="p-4 text-sm text-muted">No hay cotizaciones abiertas.</div>}
        </Panel>

        <Panel title="Actividad reciente" right={<Link href="/movimientos" className="link-btn no-underline">Kardex →</Link>}>
          {movs.slice(0, 7).map((m) => (
            <div key={m.id} className="grid grid-cols-[44px_minmax(0,1fr)] gap-2.5 border-b border-n200 px-4 py-2.5 text-xs">
              <div className="leading-[1.3] text-muted">{m.fecha === hoy ? m.hora : fmtDateShort(m.fecha)}</div>
              <div className="leading-[1.4]"><b>{m.user}</b> {VERB[m.tipo]} {fmt(Math.abs(m.cant))} {m.cod}{m.cot ? ` · ${m.cot}` : m.motivo ? ` · ${m.motivo.split(" · ")[0]}` : ""}</div>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}
