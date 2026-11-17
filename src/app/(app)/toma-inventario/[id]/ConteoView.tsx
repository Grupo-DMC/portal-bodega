"use client";

import { useState } from "react";
import { avanzarConteoAction, guardarConteoAction } from "@/actions/operaciones";
import { useRun } from "@/components/controls";
import { Notice } from "@/components/ui";
import { fmt, fmtS } from "@/lib/format";

type Info = { id: string; estado: "Borrador" | "En conteo" | "Por aprobar" | "Aplicado"; bod: string; fam: string; fecha: string; user: string };
type Line = { cod: string; desc: string; sys: number; val: number | null };
const ORDER = ["Borrador", "En conteo", "Por aprobar", "Aplicado"] as const;
const NEXT_LABEL: Record<string, string> = { Borrador: "Iniciar conteo", "En conteo": "Enviar a aprobación", "Por aprobar": "Aprobar y aplicar ajustes" };

export function ConteoView({ info, lines, canOperate, canApprove }: { info: Info; lines: Line[]; canOperate: boolean; canApprove: boolean }) {
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(lines.map((l) => [l.cod, l.val === null ? "" : String(l.val)])));
  const [saved, setSaved] = useState("");
  const { pending, error, run } = useRun();
  const idx = ORDER.indexOf(info.estado);
  const editable = canOperate && info.estado === "En conteo";

  const calc = lines.map((l) => {
    const raw = vals[l.cod] ?? "";
    const has = raw.trim() !== "";
    const n = Number(raw);
    const valid = has && Number.isInteger(n) && n >= 0;
    const dif = valid ? n - l.sys : null;
    return { ...l, raw, has, valid, n, dif };
  });
  const counted = calc.filter((c) => c.valid).length;
  const withDif = calc.filter((c) => c.dif).length;
  const anyInvalid = calc.some((c) => c.has && !c.valid);
  const payload = () => ({ id: info.id, counts: Object.fromEntries(calc.filter((c) => c.valid).map((c) => [c.cod, c.n])) });

  const canNext = canOperate && info.estado !== "Aplicado" && (info.estado !== "Por aprobar" || canApprove);
  const blocked = info.estado === "En conteo" && (counted === 0 || anyInvalid);

  function next() {
    setSaved("");
    run(async () => {
      if (info.estado === "En conteo") {
        const s = await guardarConteoAction(payload());
        if (!s.ok) return s;
      }
      return avanzarConteoAction({ id: info.id });
    });
  }

  return (
    <>
      <ol className="m-0 grid list-none grid-cols-2 border border-n300 bg-white p-0 sm:grid-cols-4" aria-label="Avance del conteo">
        {ORDER.map((l, i) => (
          <li key={l} aria-current={i === idx ? "step" : undefined} className={`border-r border-t-4 border-n300 px-4 py-3.5 last:border-r-0 ${i <= idx ? "border-t-accent" : "border-t-n200"} ${i === idx ? "bg-a100" : "bg-white"}`}>
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted">Paso {i + 1}</div>
            <div className={`text-[15px] font-extrabold ${i <= idx ? "" : "text-n500"}`}>{l}</div>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-x-8 gap-y-1 text-[13px]">
        <span>Bodega <b>{info.bod}</b></span><span>Familia <b>{info.fam}</b></span><span>Fecha <b>{info.fecha}</b></span><span>Responsable <b>{info.user}</b></span>
      </div>
      {saved && <Notice tone="ok">{saved}</Notice>}
      <section className="panel" aria-label="Productos del conteo">
        <div className="table-wrap">
          <table className="tbl min-w-[640px]">
            <thead><tr><th>Código</th><th>Descripción</th><th className="r">Stock sistema</th><th className="r w-[180px]">Cantidad contada</th><th className="r">Diferencia</th></tr></thead>
            <tbody>
              {calc.map((c) => (
                <tr key={c.cod} className={c.dif ? (c.dif < 0 ? "[&>td]:!bg-a100" : "[&>td]:!bg-ok-bg/60") : ""}>
                  <td className="font-bold">{c.cod}</td><td>{c.desc}</td><td className="r">{fmt(c.sys)}</td>
                  <td><input aria-label={`Cantidad contada de ${c.cod}`} className="input !min-h-8 text-right !font-bold" type="number" min={0} step={1} inputMode="numeric" placeholder="—" value={c.raw} disabled={!editable} aria-invalid={c.has && !c.valid} onChange={(e) => setVals((v) => ({ ...v, [c.cod]: e.target.value }))} /></td>
                  <td className={`r font-extrabold ${c.dif && c.dif > 0 ? "text-ok-fg" : c.dif && c.dif < 0 ? "text-a700" : "text-muted"}`}>{c.dif === null ? "—" : c.dif === 0 ? "0" : fmtS(c.dif)}</td>
                </tr>
              ))}
              {!calc.length && <tr><td colSpan={5} className="text-muted">No hay productos con stock en esta bodega. Cree el conteo filtrando por una familia para contar productos sin saldo.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-divider bg-n100 px-4 py-3.5">
          <span className="text-[13px]" aria-live="polite">
            {error ? <b className="text-a700">{error}</b> : <>Contados <b>{counted}</b> de {calc.length} · Con diferencia <b className="text-a700">{withDif}</b> · Al aplicar se generan movimientos de ajuste con motivo “Conteo físico”.</>}
          </span>
          <div className="flex gap-2">
            {editable && (
              <button type="button" className="btn btn-outline" disabled={pending || anyInvalid} onClick={() => { setSaved(""); run(() => guardarConteoAction(payload()), () => setSaved("Progreso guardado.")); }}>Guardar progreso</button>
            )}
            {canNext && (
              <button type="button" className="btn btn-primary" disabled={blocked || pending} onClick={next}>{pending ? "Procesando…" : `${NEXT_LABEL[info.estado]} →`}</button>
            )}
            {info.estado === "Por aprobar" && !canApprove && <span className="self-center text-xs font-semibold text-warn-fg">Pendiente de aprobación por un administrador.</span>}
          </div>
        </div>
      </section>
    </>
  );
}
