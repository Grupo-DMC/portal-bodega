"use client";

import { useState } from "react";
import { ArrowRight, Plus, TriangleAlert, X } from "lucide-react";
import { salidaManualAction } from "@/actions/operaciones";
import { useRun } from "@/components/controls";
import { Field, Notice, Panel } from "@/components/ui";
import { fmt } from "@/lib/format";
import type { BodCod } from "@/lib/domain";

type Prod = { cod: string; desc: string; stock: Record<BodCod, number> };
type Line = { cod: string; bod: BodCod; qty: string };
const blank = (): Line => ({ cod: "", bod: "BC", qty: "1" });
const emptyF = { guia: "", oc: "", hep: "", cli: "", motivo: "", det: "" };

export function SalidaForm({ products, bodegas, clientes, motivos, canAct }: { products: Prod[]; bodegas: { v: string; l: string }[]; clientes: string[]; motivos: string[]; canAct: boolean }) {
  const [lines, setLines] = useState<Line[]>([blank()]);
  const [f, setF] = useState(emptyF);
  const [tried, setTried] = useState(false);
  const [ok, setOk] = useState("");
  const { pending, error, run } = useRun();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  // Acumula por (producto, bodega): dos filas del mismo producto no pueden, juntas, superar el stock.
  const acc: Record<string, number> = {};
  const rows = lines.map((l) => {
    const p = products.find((x) => x.cod === l.cod);
    const stock = p ? p.stock[l.bod] : 0;
    const q = Number(l.qty);
    const k = `${l.cod}|${l.bod}`;
    acc[k] = (acc[k] ?? 0) + (Number.isFinite(q) ? q : 0);
    const bodName = bodegas.find((b) => b.v === l.bod)?.l;
    const err = !p ? "" : !Number.isInteger(q) || q <= 0 ? "Cantidad inválida." : acc[k] > stock ? `Supera el stock de ${bodName} (${fmt(stock)}). El saldo no puede quedar negativo.` : "";
    return { l, p, stock, err };
  });
  const hasErr = rows.some((r) => r.err || !r.p);
  const hasDoc = !!(f.guia.trim() || f.oc.trim() || f.hep.trim());
  const detReq = f.motivo === "Otro";
  const motErr = tried && (!f.motivo ? "Seleccione un motivo del catálogo." : detReq && !f.det.trim() ? "Con motivo “Otro” el detalle es obligatorio." : "");

  function confirm() {
    setTried(true);
    if (!hasDoc || !f.motivo || (detReq && !f.det.trim()) || hasErr) return;
    run(
      () => salidaManualAction({ lines: lines.map((l) => ({ cod: l.cod, bod: l.bod, qty: Number(l.qty) })), guia: f.guia.trim(), oc: f.oc.trim(), hep: f.hep.trim(), cli: f.cli, motivo: f.motivo, det: f.det.trim() }),
      (r) => {
        const x = r as unknown as { lineas: number; doc: string };
        setOk(`Salida registrada: ${x.lineas} productos · ${f.motivo} · ${x.doc}.`);
        setLines([blank()]); setF(emptyF); setTried(false);
      },
    );
  }

  return (
    <>
      <div className="notice notice-warn"><TriangleAlert size={20} className="flex-none" aria-hidden /><span>Esta salida no tiene N° de cotización: el <b>motivo es obligatorio</b> y debe adjuntar al menos un documento (Guía, OC o HEP).</span></div>
      {ok && <Notice tone="ok">{ok}</Notice>}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Panel title="Productos">
          <div className="table-wrap">
            <table className="tbl min-w-[620px]">
              <thead><tr><th>Producto</th><th>Bodega</th><th className="r">Stock disp.</th><th className="r w-[130px]">Cantidad</th><th className="w-9"><span className="sr-only">Quitar</span></th></tr></thead>
              <tbody>
                {rows.map(({ l, stock, err }, i) => (
                  <tr key={i} className={err ? "[&>td]:!bg-a100" : ""}>
                    <td>
                      <select aria-label={`Producto fila ${i + 1}`} className="input !min-h-8" value={l.cod} disabled={!canAct} onChange={(e) => setLines((s) => s.map((x, j) => j === i ? { ...x, cod: e.target.value } : x))}>
                        <option value="">Seleccione producto…</option>
                        {products.map((p) => <option key={p.cod} value={p.cod}>{p.cod} · {p.desc}</option>)}
                      </select>
                      {err && <div className="field-err mt-1" role="alert">{err}</div>}
                    </td>
                    <td><select aria-label={`Bodega fila ${i + 1}`} className="input !min-h-8" value={l.bod} disabled={!canAct} onChange={(e) => setLines((s) => s.map((x, j) => j === i ? { ...x, bod: e.target.value as BodCod } : x))}>{bodegas.map((b) => <option key={b.v} value={b.v}>{b.l}</option>)}</select></td>
                    <td className="r font-semibold">{l.cod ? fmt(stock) : "—"}</td>
                    <td><input aria-label={`Cantidad fila ${i + 1}`} className="input !min-h-8 text-right !font-bold" type="number" min={1} step={1} inputMode="numeric" value={l.qty} disabled={!canAct} aria-invalid={!!err} onChange={(e) => setLines((s) => s.map((x, j) => j === i ? { ...x, qty: e.target.value } : x))} /></td>
                    <td><button type="button" aria-label={`Quitar fila ${i + 1}`} className="grid h-8 w-8 cursor-pointer place-items-center border-0 bg-transparent text-muted hover:text-ink" onClick={() => setLines((s) => s.length > 1 ? s.filter((_, j) => j !== i) : s)}><X size={16} aria-hidden /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5"><button type="button" className="btn btn-ghost btn-sm" disabled={!canAct} onClick={() => setLines((s) => [...s, blank()])}><Plus size={14} aria-hidden /> Agregar producto</button></div>
        </Panel>

        <Panel title="Documento y motivo">
          <div className="flex flex-col gap-3.5 p-4">
            <div className="grid grid-cols-3 gap-2.5">
              {([["guia", "Guía"], ["oc", "OC"], ["hep", "HEP"]] as const).map(([k, l]) => (
                <Field key={k} label={l} htmlFor={`s-${k}`}><input id={`s-${k}`} className="input" maxLength={30} value={f[k]} disabled={!canAct} aria-invalid={tried && !hasDoc} onChange={set(k)} /></Field>
              ))}
            </div>
            {tried && !hasDoc && <span className="field-err -mt-1.5" role="alert">Ingrese al menos un documento: Guía, OC o HEP.</span>}
            <Field label="Cliente (opcional)" htmlFor="s-cli"><select id="s-cli" className="input" value={f.cli} disabled={!canAct} onChange={set("cli")}><option value="">Sin cliente</option>{clientes.map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
            <Field label="Motivo *" htmlFor="s-mot"><select id="s-mot" className="input" value={f.motivo} disabled={!canAct} aria-invalid={tried && !f.motivo} onChange={set("motivo")}><option value="">Seleccione motivo…</option>{motivos.map((m) => <option key={m} value={m}>{m}</option>)}</select></Field>
            <Field label={`Detalle ${detReq ? "*" : "(opcional)"}`} htmlFor="s-det"><textarea id="s-det" className="input !min-h-[70px]" maxLength={400} value={f.det} disabled={!canAct} aria-invalid={tried && detReq && !f.det.trim()} placeholder="Ej: préstamo a Marcelo Rojas para visita técnica en Osorno" onChange={set("det")} /></Field>
            {motErr && <span className="field-err" role="alert">{motErr}</span>}
            {error && <span className="field-err" role="alert">{error}</span>}
          </div>
          {canAct && (
            <div className="border-t-2 border-divider p-4">
              <button type="button" className="btn btn-primary btn-wide !py-[13px]" disabled={hasErr || pending} onClick={confirm}>{pending ? "Registrando…" : "Registrar salida"} <ArrowRight size={16} aria-hidden /></button>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
