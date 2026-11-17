"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, ImageIcon, Plus, X } from "lucide-react";
import { guardarProductoAction } from "@/actions/maestros";
import { Switch, useRun } from "@/components/controls";
import { Notice } from "@/components/ui";
import { fmt } from "@/lib/format";
import type { BodCod } from "@/lib/domain";

export type ProductoInitial = {
  cod: string; desc: string; fam: string; sub: string; um: string; formato: string; inv: boolean; activo: boolean; crit: number;
  med: { tipo: "Producto" | "Embalaje"; l: number | null; a: number | null; h: number | null; u: "cm" | "mm" | "m"; peso: number | null; pu: "kg" | "g" } | null;
  tieneFoto: boolean;
};
type Opt = { v: string; l: string };
const MAX_IMG = 2 * 1024 * 1024;

const lbl = "label";
const numOrNull = (s: string) => (s.trim() === "" || Number.isNaN(Number(s)) ? null : Number(s));

export function ProductoForm({ initial, familias, subfamilias, bodegas }: { initial: ProductoInitial | null; familias: Opt[]; subfamilias: (Opt & { fam: string })[]; bodegas: Opt[] }) {
  const router = useRouter();
  const editing = !!initial;
  const [f, setF] = useState({
    cod: initial?.cod ?? "", desc: initial?.desc ?? "", fam: initial?.fam ?? "", sub: initial?.sub ?? "", um: initial?.um ?? "UN", formato: initial?.formato ?? "",
    inv: initial?.inv ?? true, activo: initial?.activo ?? true, crit: initial ? String(initial.crit) : "",
    tipo: initial?.med?.tipo ?? "Producto", l: String(initial?.med?.l ?? ""), a: String(initial?.med?.a ?? ""), h: String(initial?.med?.h ?? ""), u: initial?.med?.u ?? "cm",
    peso: String(initial?.med?.peso ?? ""), pu: initial?.med?.pu ?? "kg",
  });
  const [stock, setStock] = useState<{ bod: string; qty: string }[]>([{ bod: "BC", qty: "" }]);
  const [medOpen, setMedOpen] = useState(!!initial?.med);
  const [stockOpen, setStockOpen] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);
  const [tried, setTried] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imgErr, setImgErr] = useState("");
  const [drag, setDrag] = useState(false);
  const { pending, error, run } = useRun();
  const upd = (p: Partial<typeof f>) => setF((s) => ({ ...s, ...p }));

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const errs = useMemo(() => {
    const e: { cod?: string; desc?: string; fam?: string } = {};
    if (!tried) return e;
    if (!f.cod.trim()) e.cod = "Ingrese el código maestro.";
    else if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,29}$/.test(f.cod.trim())) e.cod = "Use letras, números, punto o guion (máx. 30).";
    if (!f.desc.trim()) e.desc = "Ingrese la descripción.";
    if (!f.fam) e.fam = "Seleccione la familia.";
    return e;
  }, [tried, f.cod, f.desc, f.fam]);
  const errCount = Object.keys(errs).length;

  function pickImage(file?: File) {
    setImgErr("");
    if (!file) return;
    if (!/^image\/(jpeg|png)$/.test(file.type)) { setImgErr("Solo se permiten imágenes JPG o PNG."); return; }
    if (file.size > MAX_IMG) { setImgErr("La imagen supera 2 MB."); return; }
    setFile(file);
  }

  function save() {
    setTried(true);
    if (!f.cod.trim() || !f.desc.trim() || !f.fam || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,29}$/.test(f.cod.trim())) return;
    const l = numOrNull(f.l), a = numOrNull(f.a), h = numOrNull(f.h);
    const med = l || a || h ? { tipo: f.tipo, l, a, h, u: f.u, peso: numOrNull(f.peso), pu: f.pu } : null;
    const cod = f.cod.trim().toUpperCase();
    run(
      () => guardarProductoAction({
        editing, cod, desc: f.desc.trim(), fam: f.fam, sub: f.sub, um: f.um, formato: f.formato.trim(), inv: f.inv, activo: f.activo,
        crit: f.crit.trim() === "" ? 0 : Number(f.crit), med,
        stock: editing || !f.inv ? [] : stock.map((s) => ({ bod: s.bod as BodCod, qty: s.qty.trim() === "" ? 0 : Number(s.qty) })),
      }),
      async () => {
        if (file) {
          const fd = new FormData();
          fd.append("file", file);
          await fetch(`/api/productos/${encodeURIComponent(cod)}/foto`, { method: "POST", body: fd }).catch(() => null);
        }
        router.push(`/productos/${encodeURIComponent(cod)}`);
        router.refresh();
      },
    );
  }

  const stockTot = stock.reduce((s, x) => s + (Number(x.qty) || 0), 0);
  const med = f.l || f.a || f.h ? `${f.tipo} · ${[f.l || "—", f.a || "—", f.h || "—"].join(" × ")} ${f.u}${f.peso ? ` · ${f.peso} ${f.pu}` : ""}` : "—";
  const summary: [string, string, string?][] = [
    ["Código", f.cod || "—"], ["Descripción", f.desc || "—"], ["Familia", familias.find((x) => x.v === f.fam)?.l ?? "—"], ["Subfamilia", subfamilias.find((x) => x.v === f.sub)?.l ?? "—"],
    ["Formato", f.formato ? `${f.formato} · ${f.um}` : f.um], ["Inventariable", f.inv ? "Sí" : "No · no descuenta stock"], ["Medidas", med],
    ["Stock inicial", editing ? "Se modifica con movimientos" : !f.inv ? "No aplica" : stockTot ? `${fmt(stockTot)} ${f.um}` : "—"],
    ["Crítico", f.inv && f.crit !== "" ? fmt(Number(f.crit)) : "—"], ["Estado", f.activo ? "Activo" : "Inactivo", f.activo ? "text-ok-fg" : "text-muted"],
  ];
  const subOpts = subfamilias.filter((s) => s.fam === f.fam);
  const fieldErr = (m?: string) => (m ? <span className="field-err" role="alert">{m}</span> : null);
  const secHead = "border-b border-n300 bg-n200 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em]";

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-6">
        <section className="panel">
          <div className={secHead}>Identificación del ítem</div>
          <div className="grid gap-x-5 gap-y-[18px] p-5 sm:grid-cols-2">
            <div className="field"><label className={lbl} htmlFor="p-cod">Código maestro *</label>
              <input id="p-cod" className="input font-bold uppercase" value={f.cod} disabled={editing} maxLength={30} placeholder="Ej: SD53" aria-invalid={!!errs.cod} onChange={(e) => upd({ cod: e.target.value.toUpperCase() })} />{fieldErr(errs.cod)}</div>
            <div className="field"><label className={lbl} htmlFor="p-desc">Descripción *</label>
              <input id="p-desc" className="input" value={f.desc} maxLength={200} placeholder="Ej: SD-53 Master AM" aria-invalid={!!errs.desc} onChange={(e) => upd({ desc: e.target.value })} />{fieldErr(errs.desc)}</div>
            <div className="field"><label className={lbl} htmlFor="p-fam">Familia *</label>
              <select id="p-fam" className="input" value={f.fam} aria-invalid={!!errs.fam} onChange={(e) => upd({ fam: e.target.value, sub: "" })}><option value="">Seleccione…</option>{familias.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select>{fieldErr(errs.fam)}</div>
            <div className="field"><label className={lbl} htmlFor="p-sub">Subfamilia <span className="font-normal normal-case tracking-normal">(opcional)</span></label>
              <select id="p-sub" className="input" value={f.sub} disabled={!f.fam} onChange={(e) => upd({ sub: e.target.value })}><option value="">{f.fam ? "Sin subfamilia" : "Primero elija familia"}</option>{subOpts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select></div>
            <div className="field"><label className={lbl} htmlFor="p-um">Unidad de medida base</label>
              <select id="p-um" className="input" value={f.um} onChange={(e) => upd({ um: e.target.value })}>{[["UN", "UN · Unidad"], ["MT", "MT · Metro"], ["KG", "KG · Kilogramo"], ["LT", "LT · Litro"], ["CJ", "CJ · Caja"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div className="field"><label className={lbl} htmlFor="p-fmt">Formato de venta <span className="font-normal normal-case tracking-normal">(opcional)</span></label>
              <input id="p-fmt" className="input" value={f.formato} maxLength={60} placeholder="Ej: Caja x 100" onChange={(e) => upd({ formato: e.target.value })} /></div>
          </div>
          <div className="grid border-t border-n300 sm:grid-cols-2">
            <div className="flex gap-3.5 border-b border-n300 p-4 sm:border-b-0 sm:border-r sm:px-5">
              <Switch checked={f.inv} onChange={(v) => upd({ inv: v })} label="Inventariable" />
              <div><div className="text-sm font-bold">Inventariable · {f.inv ? "Sí" : "No"}</div><div className="text-xs text-muted">Los no inventariables no aparecen en inventario ni descuentan stock.</div></div>
            </div>
            <div className="flex gap-3.5 p-4 sm:px-5">
              <Switch checked={f.activo} onChange={(v) => (v ? upd({ activo: true }) : setConfirmOff(true))} label="Activo" />
              <div><div className="text-sm font-bold">Activo · {f.activo ? "Sí" : "No"}</div><div className="text-xs text-muted">Los productos se desactivan, nunca se eliminan.</div></div>
            </div>
          </div>
          {confirmOff && (
            <div className="flex flex-wrap items-center justify-between gap-4 border-t-2 border-accent bg-a100 px-5 py-3.5" role="alertdialog" aria-label="Confirmar desactivación">
              <span className="text-[13px] text-a800"><b>¿Desactivar este producto?</b> Dejará de estar disponible para cotizar, despachar e ingresar. Su historial se conserva.</span>
              <div className="flex flex-none gap-2"><button type="button" className="btn btn-outline btn-sm" onClick={() => setConfirmOff(false)}>No</button><button type="button" className="btn btn-primary btn-sm" onClick={() => { upd({ activo: false }); setConfirmOff(false); }}>Sí, desactivar</button></div>
            </div>
          )}
        </section>

        <section className="panel">
          <button type="button" aria-expanded={medOpen} onClick={() => setMedOpen((o) => !o)} className="flex min-h-11 w-full cursor-pointer items-center justify-between border-0 border-b border-n300 bg-n200 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em]">
            <span>Medidas <span className="font-normal tracking-[0.06em] text-muted">· opcional</span></span>
            <ChevronDown size={14} strokeWidth={2.4} className={`transition-transform duration-150 ${medOpen ? "rotate-180" : ""}`} aria-hidden />
          </button>
          {medOpen && (
            <div className="flex flex-col gap-[18px] p-5">
              <div className="flex flex-wrap items-center gap-4">
                <span className={lbl}>Tipo de medida</span>
                <div className="flex border border-ink" role="group" aria-label="Tipo de medida">
                  {(["Producto", "Embalaje"] as const).map((t) => <button key={t} type="button" aria-pressed={f.tipo === t} onClick={() => upd({ tipo: t })} className={`min-h-9 cursor-pointer border-0 px-3.5 text-xs font-semibold uppercase tracking-[0.08em] ${f.tipo === t ? "bg-ink text-white" : "bg-white text-ink hover:bg-n100"}`}>{t}</button>)}
                </div>
              </div>
              <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-3 lg:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.2fr)_minmax(0,0.8fr)]">
                {([["l", "Largo"], ["a", "Ancho"], ["h", "Alto"]] as const).map(([k, l]) => <div key={k} className="field"><label className={lbl} htmlFor={`m-${k}`}>{l}</label><input id={`m-${k}`} className="input" type="number" min={0} step="any" inputMode="decimal" value={f[k]} onChange={(e) => upd({ [k]: e.target.value })} /></div>)}
                <div className="field"><label className={lbl} htmlFor="m-u">Unidad</label><select id="m-u" className="input" value={f.u} onChange={(e) => upd({ u: e.target.value as "cm" | "mm" | "m" })}><option value="cm">cm</option><option value="mm">mm</option><option value="m">m</option></select></div>
                <div className="field"><label className={lbl} htmlFor="m-peso">Peso <span className="font-normal normal-case tracking-normal">(opc.)</span></label><input id="m-peso" className="input" type="number" min={0} step="any" inputMode="decimal" value={f.peso} onChange={(e) => upd({ peso: e.target.value })} /></div>
                <div className="field"><label className={lbl} htmlFor="m-pu">Unidad</label><select id="m-pu" className="input" value={f.pu} onChange={(e) => upd({ pu: e.target.value as "kg" | "g" })}><option value="kg">kg</option><option value="g">g</option></select></div>
              </div>
            </div>
          )}
        </section>

        <section className="panel">
          <div className={`${secHead} flex items-center justify-between`}><span>Stock inicial y crítico</span>{stockOpen && !editing && f.inv && <button type="button" className="link-btn" onClick={() => setStockOpen(false)}>Ocultar</button>}</div>
          {!f.inv ? (
            <div className="px-5 py-4 text-[13px] text-muted">No aplica: el producto está marcado como no inventariable.</div>
          ) : (
            <div className="grid gap-6 p-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="flex flex-col gap-2.5">
                {editing ? (
                  <Notice tone="info">El stock de un producto existente se modifica con movimientos (entradas, salidas, conteos), no desde la ficha.</Notice>
                ) : !stockOpen ? (
                  <button type="button" className="btn btn-ghost w-fit !normal-case !tracking-normal underline underline-offset-[3px]" onClick={() => setStockOpen(true)}>Configurar stock inicial →</button>
                ) : (
                  <>
                    <span className={lbl}>Saldo actual por bodega</span>
                    {stock.map((s, i) => (
                      <div key={i} className="grid grid-cols-[minmax(0,1fr)_120px_40px] gap-2">
                        <select aria-label="Bodega" className="input" value={s.bod} onChange={(e) => setStock((x) => x.map((y, j) => j === i ? { ...y, bod: e.target.value } : y))}>{bodegas.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select>
                        <input aria-label="Cantidad" className="input text-right" type="number" min={0} step={1} inputMode="numeric" placeholder="Cantidad" value={s.qty} onChange={(e) => setStock((x) => x.map((y, j) => j === i ? { ...y, qty: e.target.value } : y))} />
                        <button type="button" aria-label="Quitar bodega" className="btn btn-outline btn-icon" onClick={() => setStock((x) => x.filter((_, j) => j !== i))}><X size={14} aria-hidden /></button>
                      </div>
                    ))}
                    {stock.length < 3 && <button type="button" className="btn btn-ghost btn-sm w-fit" onClick={() => setStock((x) => [...x, { bod: bodegas.find((b) => !x.some((s) => s.bod === b.v))?.v ?? "BC", qty: "" }])}><Plus size={14} aria-hidden /> Agregar bodega</button>}
                  </>
                )}
              </div>
              <div className="field"><label className={lbl} htmlFor="p-crit">Stock mínimo crítico</label>
                <input id="p-crit" className="input text-right !font-bold" type="number" min={0} step={1} inputMode="numeric" value={f.crit} onChange={(e) => upd({ crit: e.target.value })} />
                <span className="hint">Bajo este saldo el producto queda en rojo y se envía la alerta por correo.</span></div>
            </div>
          )}
        </section>
      </div>

      <div className="flex flex-col gap-6 lg:sticky lg:top-24">
        <section className="panel">
          <div className={secHead}>Imagen del producto</div>
          <div className="p-4">
            {preview ? (
              <div className="flex flex-col gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Vista previa de la imagen" className="grayscale-img aspect-[4/3] w-full bg-n100 object-contain outline outline-1 -outline-offset-1 outline-black/10" />
                <button type="button" className="btn btn-ghost btn-sm w-fit" onClick={() => setFile(null)}>Quitar imagen</button>
              </div>
            ) : (
              <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); pickImage(e.dataTransfer.files[0]); }}
                className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed px-4 py-8 text-center ${drag ? "border-accent bg-a100" : "border-n400 bg-n100"}`}>
                <ImageIcon size={36} strokeWidth={1.6} className="text-muted" aria-hidden />
                <span className="text-[13px] text-n700">{initial?.tieneFoto ? "Ya tiene una imagen. Suba otra para reemplazarla." : "Arrastre una imagen o seleccione un archivo"}</span>
                <label className="btn btn-outline btn-sm cursor-pointer">Seleccionar archivo<input type="file" accept="image/jpeg,image/png" className="sr-only" onChange={(e) => { pickImage(e.target.files?.[0]); e.target.value = ""; }} /></label>
                <span className="text-[11px] text-muted">JPG o PNG · máx. 2 MB</span>
              </div>
            )}
            {imgErr && <div className="field-err mt-2" role="alert">{imgErr}</div>}
          </div>
        </section>

        <section className="panel">
          <div className={secHead}>Resumen del registro</div>
          <dl className="m-0 px-4 pb-2 pt-1">
            {summary.map(([k, v, c]) => (
              <div key={k} className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 border-b border-n200 py-2 text-[13px]">
                <dt className="pt-0.5 text-[10px] uppercase tracking-[0.14em] text-muted">{k}</dt><dd className={`m-0 break-words font-semibold ${c ?? (v === "—" ? "text-n400" : "")}`}>{v}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-col gap-2 border-t-2 border-divider p-4">
            <button type="button" className="btn btn-primary btn-wide !py-3.5 !text-sm" disabled={pending} onClick={save}>{pending ? "Guardando…" : "Guardar producto"} <ArrowRight size={16} aria-hidden /></button>
            <button type="button" className="btn btn-outline" onClick={() => router.push("/productos")}>Cancelar</button>
            {error && <span className="field-err" role="alert">{error}</span>}
            {errCount > 0 && <span className="text-xs font-semibold text-a700" role="alert">Revise los campos marcados ({errCount}).</span>}
          </div>
        </section>
      </div>
    </div>
  );
}
