"use client";

import { useId, useMemo, useState } from "react";
import { ArrowRight, FileSpreadsheet, Info, Plus, X } from "lucide-react";
import { ingresarPackingAction, registrarDevolucionAction } from "@/actions/operaciones";
import { useRun } from "@/components/controls";
import { Field, Notice, Panel } from "@/components/ui";
import { CSV_MAX_BYTES, parseCsv } from "@/lib/csv";
import { fmt } from "@/lib/format";

type Prod = { cod: string; desc: string; inv: boolean; activo: boolean };
type Line = { cod: string; qty: string };

function useCatalog(products: Prod[]) {
  const map = useMemo(() => new Map(products.map((p) => [p.cod, p])), [products]);
  const options = useMemo(() => products.filter((p) => p.inv && p.activo), [products]);
  function validate(cod: string, qty: string): { ok: boolean; v: string; p?: Prod } {
    const c = cod.trim().toUpperCase();
    const p = map.get(c);
    const q = Number(qty);
    if (!c) return { ok: false, v: "Ingrese un código" };
    if (!p) return { ok: false, v: "Código inexistente" };
    if (!p.inv) return { ok: false, v: "Producto no inventariable", p };
    if (!p.activo) return { ok: false, v: "Producto inactivo", p };
    if (qty.trim() === "" || !Number.isInteger(q) || q <= 0) return { ok: false, v: "Cantidad inválida", p };
    return { ok: true, v: "OK", p };
  }
  return { map, options, validate };
}

const SAMPLE: Line[] = [
  { cod: "SD51", qty: "12" }, { cod: "SD52", qty: "12" }, { cod: "ETQ-RF82", qty: "60000" }, { cod: "FUE-24", qty: "10" },
  { cod: "SD-99", qty: "4" }, { cod: "CP-01", qty: "cuatro" }, { cod: "INS-01", qty: "2" },
];

/** "60.000" y "60 000" → 60000; texto no numérico se conserva para mostrar el error. */
function parseQty(raw: string): string {
  const s = raw.trim().replace(/\s/g, "");
  return /^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, "") : s;
}

// ═════════════════════════ Packing list ═════════════════════════

export function PackingForm({ products, bodegas, canAct, today }: { products: Prod[]; bodegas: { v: string; l: string }[]; canAct: boolean; today: string }) {
  const { options, validate, map } = useCatalog(products);
  const listId = useId();
  const [h, setH] = useState({ prov: "", pl: "", fac: "", bod: "BC" });
  const [mode, setMode] = useState<"excel" | "manual">("excel");
  const [file, setFile] = useState<string | null>(null);
  const [fileLines, setFileLines] = useState<Line[]>([]);
  const [manLines, setManLines] = useState<Line[]>([{ cod: "", qty: "" }]);
  const [ok, setOk] = useState("");
  const [fileErr, setFileErr] = useState("");
  const [tried, setTried] = useState(false);
  const { pending, error, run } = useRun();

  const manual = mode === "manual";
  const src = manual ? manLines : fileLines;
  const setSrc = manual ? setManLines : setFileLines;
  const rows = src.map((l) => ({ l, r: validate(l.cod, l.qty) }));
  const good = rows.filter((x) => x.r.ok);
  const units = good.reduce((a, x) => a + Number(x.l.qty), 0);
  const nErr = rows.length - good.length;
  const headOk = h.prov.trim() && h.pl.trim() && h.fac.trim();

  async function readFile(f: File | undefined) {
    setFileErr("");
    if (!f) return;
    if (/\.xlsx?$/i.test(f.name)) { setFileErr("Los archivos Excel (.xlsx) aún no se pueden leer: en Excel use «Guardar como → CSV (delimitado por comas/punto y coma)» y cargue ese archivo."); return; }
    if (!/\.(csv|txt)$/i.test(f.name)) { setFileErr("Formato no soportado. Cargue un archivo .csv."); return; }
    if (f.size > CSV_MAX_BYTES) { setFileErr("El archivo supera 1 MB."); return; }
    try {
      const data = parseCsv(await f.text());
      const body = /c[oó]d/i.test(data[0]?.[0] ?? "") ? data.slice(1) : data;
      const lines = body.map((r) => ({ cod: (r[0] ?? "").trim().toUpperCase().slice(0, 30), qty: parseQty(r[r.length > 2 ? 2 : 1] ?? "") }));
      if (!lines.length) { setFileErr("El archivo no tiene filas."); return; }
      setFile(f.name);
      setFileLines(lines);
    } catch (e) {
      setFileErr(e instanceof Error ? e.message : "No se pudo leer el archivo.");
    }
  }

  function confirm() {
    setTried(true);
    if (!headOk || !good.length) return;
    run(
      () => ingresarPackingAction({ ...h, lines: good.map((x) => ({ cod: x.l.cod.trim().toUpperCase(), qty: Number(x.l.qty) })) }),
      (r) => {
        const x = r as unknown as { productos: number; unidades: number };
        const b = bodegas.find((o) => o.v === h.bod)?.l;
        setOk(`Se ingresaron ${x.productos} productos (${fmt(x.unidades)} unidades) a ${b} con el ${h.pl}.`);
        setFile(null); setFileLines([]); setManLines([{ cod: "", qty: "" }]); setTried(false);
        setH({ prov: "", pl: "", fac: "", bod: h.bod });
      },
    );
  }

  return (
    <>
      {ok && <Notice tone="ok"><b>Listo.</b> {ok}</Notice>}
      <Panel title="Datos del packing list">
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
          <Field label="Proveedor *" htmlFor="pk-prov" error={tried && !h.prov.trim() ? "Obligatorio." : undefined}><input id="pk-prov" className="input" maxLength={120} value={h.prov} disabled={!canAct} placeholder="Ej: Hangzhou Century Co., Ltd." onChange={(e) => setH({ ...h, prov: e.target.value })} aria-invalid={tried && !h.prov.trim()} /></Field>
          <Field label="N° packing list *" htmlFor="pk-pl" error={tried && !h.pl.trim() ? "Obligatorio." : undefined}><input id="pk-pl" className="input" maxLength={40} value={h.pl} disabled={!canAct} placeholder="PL-2026-119" onChange={(e) => setH({ ...h, pl: e.target.value })} aria-invalid={tried && !h.pl.trim()} /></Field>
          <Field label="N° factura / DI *" htmlFor="pk-fac" error={tried && !h.fac.trim() ? "Obligatorio." : undefined}><input id="pk-fac" className="input" maxLength={40} value={h.fac} disabled={!canAct} placeholder="DI 8836640" onChange={(e) => setH({ ...h, fac: e.target.value })} aria-invalid={tried && !h.fac.trim()} /></Field>
          <Field label="Fecha de ingreso" htmlFor="pk-fecha" hint="Se registra la de hoy"><input id="pk-fecha" className="input" value={today} disabled readOnly /></Field>
          <Field label="Bodega destino" htmlFor="pk-bod"><select id="pk-bod" className="input" value={h.bod} disabled={!canAct} onChange={(e) => setH({ ...h, bod: e.target.value })}>{bodegas.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select></Field>
        </div>
      </Panel>

      <Panel
        title="Productos"
        right={
          <div className="flex border border-ink bg-white" role="group" aria-label="Modo de ingreso">
            {([["excel", "Cargar archivo"], ["manual", "Ingreso manual"]] as const).map(([k, l]) => (
              <button key={k} type="button" aria-pressed={mode === k} onClick={() => setMode(k)} className={`min-h-8 cursor-pointer border-0 px-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${mode === k ? "bg-ink text-white" : "bg-white text-ink hover:bg-n100"}`}>{l}</button>
            ))}
          </div>
        }
      >
        {!manual && !file && (
          <div className="p-4">
            <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void readFile(e.dataTransfer.files[0]); }}
              className="flex flex-col items-start gap-4 border-2 border-dashed border-n400 bg-n100 p-6 sm:flex-row sm:items-center sm:gap-5 sm:p-7">
              <FileSpreadsheet size={40} strokeWidth={1.6} className="flex-none text-muted" aria-hidden />
              <div className="flex-1">
                <div className="text-sm font-bold">Arrastre el CSV del packing list</div>
                <div className="text-xs text-muted">Columnas esperadas: Código · Descripción · Cantidad. Formato .csv (máx. 1 MB y 2.000 filas).</div>
              </div>
              <label className="btn btn-outline btn-sm cursor-pointer">Seleccionar archivo<input type="file" accept=".csv,.txt,text/csv" className="sr-only" disabled={!canAct} onChange={(e) => { void readFile(e.target.files?.[0]); e.target.value = ""; }} /></label>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setFile("packing_ejemplo.csv"); setFileLines(SAMPLE); setFileErr(""); }}>Usar archivo de ejemplo</button>
            </div>
            {fileErr && <div className="mt-3"><Notice tone="err">{fileErr}</Notice></div>}
          </div>
        )}
        {!manual && file && (
          <div className="flex items-center justify-between border-b border-n200 px-4 py-2.5 text-[13px]">
            <span>Archivo: <b>{file}</b></span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setFile(null); setFileLines([]); }}>Cambiar archivo</button>
          </div>
        )}
        {(manual || file) && (
          <>
            <div className="table-wrap">
              <table className="tbl min-w-[640px]">
                <thead><tr><th className="w-10">#</th><th>Código</th><th>Descripción</th><th className="r w-40">Cantidad</th><th>Validación</th><th className="w-10"><span className="sr-only">Quitar</span></th></tr></thead>
                <tbody>
                  {rows.map(({ l, r }, i) => (
                    <tr key={i} className={r.ok ? "" : "[&>td]:!bg-a100"}>
                      <td className="text-muted">{i + 1}</td>
                      <td>{manual ? (
                        <input aria-label={`Código fila ${i + 1}`} className="input !min-h-8 font-bold uppercase" list={listId} maxLength={30} value={l.cod} placeholder="Buscar código…" onChange={(e) => setSrc((s) => s.map((x, j) => j === i ? { ...x, cod: e.target.value.toUpperCase() } : x))} />
                      ) : <b>{l.cod}</b>}</td>
                      <td className="text-n700">{r.p?.desc ?? "—"}</td>
                      <td className="r">{manual ? (
                        <input aria-label={`Cantidad fila ${i + 1}`} className="input !min-h-8 text-right" type="number" min={1} step={1} inputMode="numeric" value={l.qty} onChange={(e) => setSrc((s) => s.map((x, j) => j === i ? { ...x, qty: e.target.value } : x))} />
                      ) : <b>{Number.isFinite(Number(l.qty)) && l.qty.trim() !== "" ? fmt(Number(l.qty)) : l.qty}</b>}</td>
                      <td><span className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${r.ok ? "text-ok-fg" : "text-a700"}`}>{r.ok ? "✓" : "✕"} {r.v}</span></td>
                      <td><button type="button" aria-label={`Quitar fila ${i + 1}`} className="grid h-8 w-8 cursor-pointer place-items-center border-0 bg-transparent text-muted hover:text-ink" onClick={() => setSrc((s) => s.filter((_, j) => j !== i))}><X size={16} aria-hidden /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <datalist id={listId}>{options.map((p) => <option key={p.cod} value={p.cod}>{p.desc}</option>)}</datalist>
            {manual && <div className="px-4 py-2.5"><button type="button" className="btn btn-ghost btn-sm" onClick={() => setManLines((s) => [...s, { cod: "", qty: "" }])}><Plus size={14} aria-hidden /> Agregar fila</button></div>}
          </>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-divider bg-n100 px-4 py-3.5">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-[13px]" aria-live="polite">
            <span>Filas válidas <b>{good.length}</b></span>
            <span className="text-a700">Con error <b>{nErr}</b></span>
            <span>Unidades a ingresar <b>{fmt(units)}</b></span>
            {nErr > 0 && <span className="text-muted">Las filas con error no se ingresan.</span>}
            {error && <b className="text-a700">{error}</b>}
          </div>
          {canAct && (
            <button type="button" className="btn btn-primary min-w-[220px] !justify-between" disabled={!good.length || pending} onClick={confirm}>
              {pending ? "Ingresando…" : "Confirmar ingreso"} <ArrowRight size={16} aria-hidden />
            </button>
          )}
        </div>
      </Panel>
      <span className="sr-only">{map.size} productos en catálogo</span>
    </>
  );
}

// ═════════════════════════ Devolución ═════════════════════════

export function DevolucionForm({ products, clientes, canAct }: { products: Prod[]; clientes: string[]; canAct: boolean }) {
  const { options, map } = useCatalog(products);
  const listId = useId();
  const [dv, setDv] = useState({ guia: "", cli: "", cot: "", motivo: "" });
  const [lines, setLines] = useState<Line[]>([{ cod: "", qty: "" }]);
  const [tried, setTried] = useState(false);
  const [ok, setOk] = useState("");
  const { pending, error, run } = useRun();

  const filled = lines.filter((l) => l.cod.trim() || l.qty.trim());
  const lineErr = (l: Line) => {
    const p = map.get(l.cod.trim().toUpperCase());
    const q = Number(l.qty);
    if (!p) return l.cod.trim() ? "Código inexistente" : "Ingrese un código";
    if (!p.inv) return "No inventariable";
    if (!Number.isInteger(q) || q <= 0) return "Cantidad inválida";
    return "";
  };
  const missing = [!dv.guia.trim() && "guía", !dv.cli && "cliente", (!filled.length || filled.some((l) => lineErr(l))) && "al menos un producto válido", !dv.motivo.trim() && "motivo"].filter(Boolean);

  function confirm() {
    setTried(true);
    if (missing.length) return;
    run(
      () => registrarDevolucionAction({ ...dv, lines: filled.map((l) => ({ cod: l.cod.trim().toUpperCase(), qty: Number(l.qty) })) }),
      (r) => {
        const x = r as unknown as { productos: number };
        setOk(`${x.productos} productos quedaron EN REVISIÓN. Revíselos en “Revisión de devoluciones”.`);
        setDv({ guia: "", cli: "", cot: "", motivo: "" }); setLines([{ cod: "", qty: "" }]); setTried(false);
      },
    );
  }

  return (
    <>
      {ok && <Notice tone="ok"><b>Listo.</b> {ok}</Notice>}
      <div className="notice notice-info"><Info size={20} className="mt-px flex-none" aria-hidden /><span>Los productos devueltos quedan <b>EN REVISIÓN</b> y no suman al stock disponible hasta ser revisados.</span></div>
      <Panel title="Devolución de cliente">
        <div className="grid gap-4 p-4 sm:grid-cols-3">
          <Field label="N° guía de despacho *" htmlFor="dv-guia"><input id="dv-guia" className="input" maxLength={30} value={dv.guia} disabled={!canAct} placeholder="Ej: 45925" onChange={(e) => setDv({ ...dv, guia: e.target.value })} aria-invalid={tried && !dv.guia.trim()} /></Field>
          <Field label="Cliente *" htmlFor="dv-cli"><select id="dv-cli" className="input" value={dv.cli} disabled={!canAct} onChange={(e) => setDv({ ...dv, cli: e.target.value })} aria-invalid={tried && !dv.cli}><option value="">Seleccione…</option>{clientes.map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
          <Field label="N° COT (opcional)" htmlFor="dv-cot"><input id="dv-cot" className="input" maxLength={20} value={dv.cot} disabled={!canAct} placeholder="COT…" onChange={(e) => setDv({ ...dv, cot: e.target.value })} /></Field>
        </div>
        <div className="table-wrap">
          <table className="tbl min-w-[560px]">
            <thead><tr><th>Producto</th><th>Descripción</th><th className="r w-40">Cantidad</th><th className="w-10"><span className="sr-only">Quitar</span></th></tr></thead>
            <tbody>
              {lines.map((l, i) => {
                const p = map.get(l.cod.trim().toUpperCase());
                const e = tried && (l.cod.trim() || l.qty.trim()) ? lineErr(l) : "";
                return (
                  <tr key={i}>
                    <td className="w-[220px]"><input aria-label={`Código fila ${i + 1}`} className="input !min-h-8 font-bold uppercase" list={listId} maxLength={30} value={l.cod} disabled={!canAct} placeholder="Código…" onChange={(ev) => setLines((s) => s.map((x, j) => j === i ? { ...x, cod: ev.target.value.toUpperCase() } : x))} aria-invalid={!!e} /></td>
                    <td className="text-n700">{p ? p.desc + (p.inv ? "" : " · no inventariable") : l.cod ? "Código inexistente" : "—"}{e && <div className="field-err">{e}</div>}</td>
                    <td><input aria-label={`Cantidad fila ${i + 1}`} className="input !min-h-8 text-right" type="number" min={1} step={1} inputMode="numeric" value={l.qty} disabled={!canAct} onChange={(ev) => setLines((s) => s.map((x, j) => j === i ? { ...x, qty: ev.target.value } : x))} /></td>
                    <td><button type="button" aria-label={`Quitar fila ${i + 1}`} className="grid h-8 w-8 cursor-pointer place-items-center border-0 bg-transparent text-muted hover:text-ink" onClick={() => setLines((s) => s.length > 1 ? s.filter((_, j) => j !== i) : s)}><X size={16} aria-hidden /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <datalist id={listId}>{options.map((p) => <option key={p.cod} value={p.cod}>{p.desc}</option>)}</datalist>
        <div className="px-4 py-2.5"><button type="button" className="btn btn-ghost btn-sm" disabled={!canAct} onClick={() => setLines((s) => [...s, { cod: "", qty: "" }])}><Plus size={14} aria-hidden /> Agregar producto</button></div>
        <div className="field px-4 pb-4"><label className="label" htmlFor="dv-motivo">Motivo de la devolución *</label><textarea id="dv-motivo" className="input !min-h-[70px]" maxLength={400} value={dv.motivo} disabled={!canAct} placeholder="Ej: antena golpeada en traslado" onChange={(e) => setDv({ ...dv, motivo: e.target.value })} aria-invalid={tried && !dv.motivo.trim()} /></div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-divider bg-n100 px-4 py-3.5">
          <span className={`text-xs font-semibold ${(tried && missing.length) || error ? "text-a700" : "text-muted"}`} aria-live="polite">
            {error || (tried && missing.length ? `Falta: ${missing.join(", ")}.` : "Ingresa a Bodega Central en estado En revisión.")}
          </span>
          {canAct && <button type="button" className="btn btn-primary min-w-[240px] !justify-between" disabled={pending} onClick={confirm}>{pending ? "Registrando…" : "Registrar devolución"} <ArrowRight size={16} aria-hidden /></button>}
        </div>
      </Panel>
    </>
  );
}
