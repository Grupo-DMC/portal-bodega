"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CircleCheck, FileDown, X } from "lucide-react";
import { despacharAction } from "@/actions/operaciones";
import { Dialog } from "@/components/Dialog";
import { useRun } from "@/components/controls";
import { Badge, StatusBadge } from "@/components/ui";
import { fmt } from "@/lib/format";
import type { BodCod } from "@/lib/domain";
import type { DespachoData } from "@/server/despachoData";

type Line = { bod: BodCod; qty: string };

export function DespachoDialog({ data, canAct, onClose }: { data: DespachoData; canAct: boolean; onClose: () => void }) {
  const init = useMemo(() => {
    const l: Record<string, Line> = {};
    for (const r of data.rows) if (r.inv && r.pend > 0) l[r.cod] = { bod: r.defaultBod, qty: String(r.pend) };
    return l;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.id]);
  const [lines, setLines] = useState<Record<string, Line>>(init);
  const [all, setAll] = useState(true);
  const [doc, setDoc] = useState({ guia: "", oc: "", hep: "", obs: data.obs });
  const [tried, setTried] = useState(false);
  const [done, setDone] = useState<{ msg: string; despachoId: string } | null>(null);
  const { pending, error, run } = useRun();
  const ro = !canAct || !data.abierta;

  const calc = data.rows.map((r) => {
    if (!r.inv) return { r, kind: "noinv" as const };
    const l = lines[r.cod] ?? { bod: r.defaultBod, qty: String(r.pend) };
    const s = r.stock[l.bod];
    const q = l.qty.trim() === "" ? 0 : Number(l.qty);
    let err = "";
    let tag: { label: string; tone: "ok" | "warn" | "neutral" } | null = null;
    if (r.pend <= 0) tag = { label: "Completa", tone: "ok" };
    else if (!Number.isInteger(q) || q < 0) err = "Cantidad inválida.";
    else if (q > s) err = `Supera el stock de ${data.bodegas.find((b) => b.cod === l.bod)?.nombre} (${fmt(s)} disp.). El saldo no puede quedar negativo.`;
    else if (q > r.pend) err = `Supera lo pendiente (${fmt(r.pend)}).`;
    else if (q > 0 && q < r.pend) tag = { label: `Parcial · quedan ${fmt(r.pend - q)}`, tone: "warn" };
    else if (q === 0) tag = { label: "No se despacha ahora", tone: "neutral" };
    return { r, kind: "inv" as const, l, s, q, err, tag };
  });

  const hasErr = calc.some((c) => c.kind === "inv" && c.err);
  const toSend = calc.flatMap((c) => (c.kind === "inv" && c.r.pend > 0 && !c.err && c.q > 0 ? [{ cod: c.r.cod, bod: c.l.bod, qty: c.q }] : []));
  const nLeft = calc.filter((c) => c.kind === "inv" && c.r.pend > 0 && (c.err || c.q < c.r.pend)).length;
  const hasDoc = !!(doc.guia.trim() || doc.oc.trim() || doc.hep.trim());
  const docErr = tried && !hasDoc;

  function setLine(cod: string, patch: Partial<Line>, unAll = false) {
    setLines((s) => ({ ...s, [cod]: { ...s[cod], ...patch } }));
    if (unAll) setAll(false);
  }
  function toggleAll() {
    if (!all) setLines((s) => Object.fromEntries(Object.entries(s).map(([cod, l]) => [cod, { ...l, qty: String(data.rows.find((r) => r.cod === cod)?.pend ?? 0) }])));
    setAll(!all);
  }
  function confirm() {
    if (!hasDoc) { setTried(true); return; }
    run(
      () => despacharAction({ cot: data.id, lines: toSend, guia: doc.guia.trim(), oc: doc.oc.trim(), hep: doc.hep.trim(), obs: doc.obs.trim() }),
      (r) => {
        const x = r as unknown as { despachoId: string; estado: string; lineas: number };
        setDone({
          despachoId: x.despachoId,
          msg: `Se descontaron ${x.lineas} ítems del stock y se generaron los movimientos. La cotización quedó en estado ${x.estado}${x.estado === "Parcial" ? " y aparece en Despachos parciales." : "."}`,
        });
      },
    );
  }

  const meta = [
    { k: "Cliente", v: data.cli, sub: `RUT ${data.rut}`, alert: false },
    { k: "Ejecutivo", v: data.eje, sub: "Ventas", alert: false },
    { k: "Fecha aprobación", v: data.aprob, sub: "", alert: false },
    { k: "Vence reserva", v: data.vence, sub: data.dias < 0 ? `Vencida hace ${-data.dias} días` : `En ${data.dias} días`, alert: data.dias <= 7 },
    { k: "Observación", v: data.obs || "—", sub: "", alert: false },
  ];

  return (
    <Dialog label={`Despacho de la cotización ${data.id}`} onClose={onClose} className="max-w-[1280px]">
      <div className="flex items-start justify-between gap-6 border-b border-n300 px-5 py-5 sm:px-7">
        <div>
          <div className="kicker mb-1.5">Despacho de cotización</div>
          <div className="flex flex-wrap items-center gap-3.5">
            <h2 className="text-[clamp(26px,4vw,36px)]">{data.id}</h2>
            <StatusBadge estado={data.estado} />
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="btn btn-outline btn-icon flex-none"><X size={18} aria-hidden /></button>
      </div>

      {done ? (
        <div className="flex flex-col items-start gap-4 px-5 py-12 sm:px-7" role="status">
          <div className="grid h-14 w-14 place-items-center bg-ok-bg text-ok-fg"><CircleCheck size={28} aria-hidden /></div>
          <h3 className="text-[32px]">Despacho registrado</h3>
          <p className="max-w-[640px] text-[15px] text-n700">{done.msg}</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Link href={`/movimientos?cot=${data.id}`} className="btn btn-primary no-underline">Ver movimientos</Link>
            <a href={`/api/despachos/${done.despachoId}/pdf`} target="_blank" rel="noopener" className="btn btn-outline no-underline"><FileDown size={16} aria-hidden /> Comprobante PDF</a>
            <button type="button" onClick={onClose} className="btn btn-outline">Cerrar</button>
          </div>
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <dl className="m-0 grid border-b border-n300 bg-n100 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1.6fr]">
              {meta.map((m) => (
                <div key={m.k} className="border-r border-n300 py-3.5 pl-5 pr-7 last:border-r-0">
                  <dt className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{m.k}</dt>
                  <dd className="m-0 text-[15px] font-bold">{m.v}</dd>
                  {m.sub && <div className={`text-xs ${m.alert ? "font-semibold text-a700" : "text-muted"}`}>{m.sub}</div>}
                </div>
              ))}
            </dl>

            {!data.abierta && <div className="mx-5 mt-5 border border-warn-bd bg-warn-bg px-4 py-3 text-sm text-warn-fg sm:mx-7">Esta cotización está <b>{data.estado}</b>: se muestra solo para consulta, no admite despachos.</div>}

            <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5 sm:px-7">
              <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm font-semibold">
                <input type="checkbox" checked={all} onChange={toggleAll} disabled={ro} className="h-[18px] w-[18px]" />Despachar todo lo pendiente
              </label>
              <span className="text-xs text-muted">El stock nunca puede quedar negativo: la cantidad se valida contra la bodega de origen.</span>
            </div>

            <div className="table-wrap px-2 pt-3 sm:px-5">
              <table className="tbl min-w-[900px]">
                <thead>
                  <tr><th>Código</th><th>Descripción</th><th className="r">Cotizado</th><th className="r">Ya despachado</th><th className="r">Pendiente</th><th className="r">Stock disp.</th><th>Bodega de origen</th><th className="w-[150px]">A despachar</th></tr>
                </thead>
                <tbody>
                  {calc.map((c) => {
                    const r = c.r;
                    if (c.kind === "noinv") {
                      return (
                        <tr key={r.cod} className="bg-n100 text-muted">
                          <td className="align-top font-bold">{r.cod}</td>
                          <td className="align-top"><div>{r.desc}</div><Badge label="No inventariable · no descuenta" tone="outline" className="mt-1 !border-dashed" /></td>
                          <td className="r align-top">{fmt(r.cant)}</td><td className="r align-top">—</td><td className="r align-top">—</td><td className="r align-top">—</td><td className="align-top">—</td><td className="align-top">—</td>
                        </tr>
                      );
                    }
                    const editable = r.pend > 0 && !ro;
                    return (
                      <tr key={r.cod} className={c.err ? "bg-a100" : ""}>
                        <td className="align-top font-bold">{r.cod}</td>
                        <td className="align-top"><div>{r.desc}</div>{c.tag && <Badge label={c.tag.label} tone={c.tag.tone} className="mt-1" />}</td>
                        <td className="r align-top">{fmt(r.cant)}</td>
                        <td className="r align-top">{fmt(r.desp)}</td>
                        <td className="r align-top font-bold">{fmt(r.pend)}</td>
                        <td className="r align-top">{fmt(c.s)}</td>
                        <td className="align-top">
                          {r.pend > 0 ? (
                            <select aria-label={`Bodega de origen de ${r.cod}`} className="input !min-h-9 !px-2 !py-1 !text-[13px]" value={c.l.bod} disabled={!editable} onChange={(e) => setLine(r.cod, { bod: e.target.value as BodCod })}>
                              {data.bodegas.map((b) => <option key={b.cod} value={b.cod}>{b.nombre} · {fmt(r.stock[b.cod])}</option>)}
                            </select>
                          ) : <span className="text-muted">—</span>}
                        </td>
                        <td className="align-top">
                          {r.pend > 0 ? (
                            <input aria-label={`Cantidad a despachar de ${r.cod}`} type="number" min={0} step={1} inputMode="numeric" className="input !min-h-9 text-right !text-sm !font-bold" value={c.l.qty} disabled={!editable} aria-invalid={!!c.err}
                              onChange={(e) => setLine(r.cod, { qty: e.target.value }, true)} />
                          ) : <span className="text-muted">—</span>}
                          {c.err && <div className="mt-1 text-[11px] font-semibold leading-[1.3] text-a700" role="alert">{c.err}</div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="m-5 border border-n300 sm:mx-7">
              <div className="panel-h"><span>Documentos del despacho</span>
                <span className={`font-semibold tracking-[0.06em] ${docErr ? "text-a700" : hasDoc ? "text-ok-fg" : "text-n700"}`}>
                  {docErr ? "Debe ingresar al menos un documento: Guía, OC o HEP" : hasDoc ? "✓ Documento ingresado" : "Obligatorio: al menos uno"}
                </span>
              </div>
              <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,2fr)]">
                {([["guia", "N° Guía de despacho", "Ej: 45932"], ["oc", "N° OC", "Orden de compra"], ["hep", "N° HEP", "HEP-"]] as const).map(([k, l, ph]) => (
                  <div key={k} className="field"><label className="label" htmlFor={`d-${k}`}>{l}</label>
                    <input id={`d-${k}`} className="input" value={doc[k]} maxLength={30} placeholder={ph} disabled={ro} aria-invalid={docErr} onChange={(e) => setDoc({ ...doc, [k]: e.target.value })} /></div>
                ))}
                <div className="field"><label className="label" htmlFor="d-obs">Observación</label>
                  <input id="d-obs" className="input" value={doc.obs} maxLength={400} disabled={ro} onChange={(e) => setDoc({ ...doc, obs: e.target.value })} /></div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t-2 border-divider bg-n100 px-5 py-4 sm:px-7">
            <div className="text-sm" aria-live="polite">
              {error ? <b className="text-a700">{error}</b> : (
                <>
                  <b>Se despacharán {toSend.length} ítems</b> <span className="text-n700">· {nLeft} quedan pendientes</span>{" "}
                  <b className={nLeft ? "text-warn-fg" : "text-ok-fg"}>{nLeft ? "→ pasará a Despachos parciales" : "→ la cotización quedará Completa"}</b>
                </>
              )}
            </div>
            {ro ? (
              <button type="button" className="btn btn-outline" onClick={onClose}>Cerrar</button>
            ) : (
              <div className="flex gap-3">
                <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
                <button type="button" className="btn btn-primary min-w-[240px] !justify-between" disabled={hasErr || toSend.length === 0 || pending} onClick={confirm}>
                  {pending ? "Registrando…" : "Confirmar despacho"} <ArrowRight size={16} aria-hidden />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </Dialog>
  );
}
