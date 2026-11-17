"use client";

import { useState } from "react";
import { aplicarRevisionAction } from "@/actions/operaciones";
import { useRun } from "@/components/controls";
import { Badge, Notice } from "@/components/ui";
import { fmt } from "@/lib/format";

export type RevisionItem = { id: string; cod: string; desc: string; um: string; cant: number; cantF: string; cli: string; guia: string; fecha: string; motivo: string; dias: string };

/** Mantiene el mensaje de confirmación aunque la tarjeta aplicada desaparezca de la lista. */
export function RevisionList({ items, bodegas, canAct }: { items: RevisionItem[]; bodegas: { v: string; l: string }[]; canAct: boolean }) {
  const [msg, setMsg] = useState("");
  return (
    <>
      {msg && <Notice tone="ok">{msg}</Notice>}
      {items.map((r) => <RevisionCard key={r.id} item={r} bodegas={bodegas} canAct={canAct} onDone={setMsg} />)}
    </>
  );
}

function RevisionCard({ item: r, bodegas, canAct, onDone }: { item: RevisionItem; bodegas: { v: string; l: string }[]; canAct: boolean; onDone: (m: string) => void }) {
  const [ok, setOk] = useState(String(r.cant));
  const [dan, setDan] = useState("0");
  const [bod, setBod] = useState("BC");
  const [obs, setObs] = useState("");
  const { pending, error, run } = useRun();

  const o = Number(ok) || 0;
  const d = Number(dan) || 0;
  const bad = !Number.isInteger(o) || !Number.isInteger(d) || o < 0 || d < 0 || o + d !== r.cant;
  const msg = bad ? `La suma debe ser ${fmt(r.cant)} (actual ${fmt(o + d)})` : `${fmt(o)} a disponible en ${bodegas.find((b) => b.v === bod)?.l} · ${fmt(d)} a dañado`;

  return (
    <section className="grid border border-n300 bg-white lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)]" aria-label={`Devolución ${r.id}`}>
      <div className="flex flex-col gap-2 border-b border-n300 p-5 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-2"><span className="kicker">{r.id}</span><Badge tone="info" label={`En revisión · ${r.dias}`} /></div>
        <div className="text-[22px] font-extrabold leading-[1.1] tracking-[-0.02em]">{r.cod} <span className="text-base font-normal">{r.desc}</span></div>
        <div className="text-[30px] font-extrabold tracking-[-0.03em] tabular-nums">{r.cantF} <span className="text-[13px] font-semibold text-muted">{r.um}</span></div>
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          <dt className="text-muted">Cliente</dt><dd className="m-0 font-bold">{r.cli}</dd>
          <dt className="text-muted">Guía</dt><dd className="m-0 font-bold">{r.guia}</dd>
          <dt className="text-muted">Ingreso</dt><dd className="m-0 font-bold">{r.fecha}</dd>
          <dt className="text-muted">Motivo</dt><dd className="m-0">{r.motivo}</dd>
        </dl>
      </div>
      <div className="flex flex-col gap-3.5 p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="field"><label className="label !text-ok-fg" htmlFor={`ok-${r.id}`}>Pasa a disponible</label>
            <input id={`ok-${r.id}`} className="input text-right !font-bold" type="number" min={0} step={1} inputMode="numeric" value={ok} disabled={!canAct} aria-invalid={bad}
              onChange={(e) => { setOk(e.target.value); setDan(String(Math.max(r.cant - (Number(e.target.value) || 0), 0))); }} /></div>
          <div className="field"><label className="label !text-a700" htmlFor={`dan-${r.id}`}>Dañado / merma</label>
            <input id={`dan-${r.id}`} className="input text-right !font-bold" type="number" min={0} step={1} inputMode="numeric" value={dan} disabled={!canAct} aria-invalid={bad}
              onChange={(e) => { setDan(e.target.value); setOk(String(Math.max(r.cant - (Number(e.target.value) || 0), 0))); }} /></div>
          <div className="field"><label className="label" htmlFor={`bod-${r.id}`}>Bodega destino</label>
            <select id={`bod-${r.id}`} className="input" value={bod} disabled={!canAct} onChange={(e) => setBod(e.target.value)}>{bodegas.map((b) => <option key={b.v} value={b.v}>{b.l}</option>)}</select></div>
        </div>
        <div className="flex h-2 bg-n200" aria-hidden>
          <div className="bg-ok-dot" style={{ width: `${Math.min((o / r.cant) * 100, 100)}%` }} />
          <div className="bg-a800" style={{ width: `${Math.min((d / r.cant) * 100, 100)}%` }} />
        </div>
        <input aria-label="Observación de la revisión" className="input" maxLength={400} value={obs} disabled={!canAct} placeholder="Observación de la revisión" onChange={(e) => setObs(e.target.value)} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={`text-xs font-semibold ${bad || error ? "text-a700" : "text-n700"}`} aria-live="polite">{error || msg}</span>
          {canAct && (
            <button type="button" className="btn btn-primary" disabled={bad || pending}
              onClick={() => run(() => aplicarRevisionAction({ id: r.id, ok: o, dan: d, bod, obs: obs.trim() }), () => onDone(`${r.id} aplicada: ${fmt(o)} ${r.cod} a disponible, ${fmt(d)} a dañado.`))}>
              {pending ? "Aplicando…" : "Aplicar revisión"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
