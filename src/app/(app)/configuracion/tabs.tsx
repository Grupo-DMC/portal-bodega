"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import {
  agregarMailAction, agregarMotivoAction, alternarMailAction, enviarPruebaAction, guardarFrecuenciaAction, guardarParametrosAction, guardarPlantillaAction, quitarMailAction, quitarMotivoAction,
} from "@/actions/config";
import { Switch, useRun } from "@/components/controls";
import { Field, Notice, Panel, StatusBadge } from "@/components/ui";
import { fmt } from "@/lib/format";

type Dest = { mail: string; activo: boolean };

// ═════════════════════════ Alertas ═════════════════════════

export function AlertasTab({ destinatarios, frecuencia, hora, amarillo, margen }: { destinatarios: Dest[]; frecuencia: "inmediata" | "diaria"; hora: string; amarillo: boolean; margen: number }) {
  const [freq, setFreq] = useState(frecuencia);
  const [h, setH] = useState(hora);
  const [am, setAm] = useState(amarillo);
  const [mail, setMail] = useState("");
  const [msg, setMsg] = useState("");
  const mailRun = useRun();
  const saveRun = useRun();
  const rowRun = useRun();
  const activos = destinatarios.filter((d) => d.activo).length;

  return (
    <>
      {msg && <Notice tone="ok"><div className="flex items-center justify-between gap-3"><span>{msg}</span><button type="button" aria-label="Cerrar mensaje" className="cursor-pointer border-0 bg-transparent" onClick={() => setMsg("")}><X size={16} aria-hidden /></button></div></Notice>}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel title="Destinatarios de alertas">
          {destinatarios.map((d) => (
            <div key={d.mail} className="flex items-center gap-3.5 border-b border-n200 px-4 py-3">
              <Switch checked={d.activo} label={`Enviar alertas a ${d.mail}`} onChange={() => rowRun.run(() => alternarMailAction({ mail: d.mail }))} />
              <span className={`min-w-0 flex-1 truncate text-sm font-semibold ${d.activo ? "" : "text-n500"}`}>{d.mail}</span>
              <StatusBadge estado={d.activo ? "Activo" : "Inactivo"} />
              <button type="button" className="btn btn-ghost btn-sm !text-n700" onClick={() => rowRun.run(() => quitarMailAction({ mail: d.mail }))}>Quitar</button>
            </div>
          ))}
          <form className="flex gap-2 px-4 py-3.5" onSubmit={(e) => { e.preventDefault(); mailRun.run(() => agregarMailAction({ mail }), () => setMail("")); }}>
            <input aria-label="Nuevo correo" className="input" type="email" maxLength={120} value={mail} placeholder="nombre@dmc.cl" aria-invalid={!!mailRun.error} onChange={(e) => { setMail(e.target.value); mailRun.setError(""); }} />
            <button type="submit" className="btn btn-outline flex-none" disabled={mailRun.pending}>+ Agregar</button>
          </form>
          {(mailRun.error || rowRun.error) && <div className="field-err px-4 pb-3" role="alert">{mailRun.error || rowRun.error}</div>}
        </Panel>

        <Panel title="Frecuencia">
          <div className="flex flex-col gap-3 p-4">
            {([["inmediata", "Inmediata al cruzar el crítico", "Un correo por producto en el momento en que su saldo baja del crítico."], ["diaria", "Resumen diario", "Un solo correo con todos los productos en rojo (y amarillo si está activo)."]] as const).map(([k, l, d]) => (
              <button key={k} type="button" role="radio" aria-checked={freq === k} onClick={() => setFreq(k)}
                className={`flex cursor-pointer items-start gap-3 border p-3 text-left ${freq === k ? "border-ink bg-n100" : "border-n300 bg-white hover:bg-n100"}`}>
                <span className="mt-0.5 grid h-4 w-4 flex-none place-items-center border-[1.5px] border-ink"><span className={`h-2 w-2 ${freq === k ? "bg-accent" : "bg-transparent"}`} /></span>
                <span><b className="text-sm">{l}</b><br /><span className="text-xs text-n700">{d}</span></span>
              </button>
            ))}
            {freq === "diaria" && (
              <div className="flex items-center gap-2.5 pl-7">
                <label className="label" htmlFor="hora">Hora de envío</label>
                <input id="hora" type="time" className="input !w-[120px]" value={h} onChange={(e) => setH(e.target.value)} />
              </div>
            )}
            <div className="flex items-start gap-3.5 border-t border-n200 pt-3">
              <Switch checked={am} onChange={setAm} label="Alertar también en amarillo" />
              <div><b className="text-sm">Alertar también en amarillo · {am ? "Sí" : "No"}</b><div className="text-xs text-n700">Incluye productos cerca del crítico (margen {margen} un.).</div></div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t-2 border-divider p-4">
            <button type="button" className="btn btn-primary" disabled={saveRun.pending} onClick={() => saveRun.run(() => guardarFrecuenciaAction({ frecuencia: freq, hora: h, amarillo: am }), () => setMsg(`Alertas guardadas: ${activos} destinatarios activos · ${freq === "diaria" ? `resumen diario a las ${h}` : "envío inmediato"}.`))}>Guardar alertas</button>
            {saveRun.error && <span className="field-err" role="alert">{saveRun.error}</span>}
          </div>
        </Panel>
      </div>
    </>
  );
}

// ═════════════════════════ Plantilla ═════════════════════════

const VARS = ["{producto_codigo}", "{producto_descripcion}", "{saldo_actual}", "{stock_critico}", "{bodega}", "{fecha}", "{tabla_productos}"];
const EX: Record<string, string> = { "{producto_codigo}": "SD52", "{producto_descripcion}": "SD-52 Slave", "{saldo_actual}": "6", "{stock_critico}": "8", "{bodega}": "Bodega Central", "{fecha}": "hoy 08:00" };
const rep = (s: string) => s.replace(/\{[a-z_]+\}/g, (m) => EX[m] ?? m);

export function PlantillaTab({ asunto: a0, cuerpo: c0, para, rojos, email }: { asunto: string; cuerpo: string; para: string[]; rojos: { cod: string; desc: string; disp: number; crit: number }[]; email: string }) {
  const [asunto, setAsunto] = useState(a0);
  const [cuerpo, setCuerpo] = useState(c0);
  const [target, setTarget] = useState<"asunto" | "cuerpo">("cuerpo");
  const [msg, setMsg] = useState("");
  const { pending, error, run } = useRun();
  const cuerpoRef = useRef<HTMLTextAreaElement>(null);

  function insert(t: string) {
    if (target === "asunto") { setAsunto((s) => `${s} ${t}`.trim()); return; }
    const el = cuerpoRef.current;
    const s = el?.selectionStart ?? cuerpo.length;
    const e = el?.selectionEnd ?? cuerpo.length;
    setCuerpo(cuerpo.slice(0, s) + t + cuerpo.slice(e));
  }

  // Vista previa: texto y tabla como nodos de React (nunca HTML en bruto).
  const blocks: ({ t: string } | "tabla")[] = [];
  cuerpo.split("{tabla_productos}").forEach((part, i, arr) => {
    part.split(/\n\s*\n/).forEach((t) => t.trim() && blocks.push({ t: rep(t.trim()) }));
    if (i < arr.length - 1) blocks.push("tabla");
  });

  return (
    <>
      {msg && <Notice tone="ok">{msg}</Notice>}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Panel title="Editor de plantilla">
          <div className="flex flex-col gap-3.5 p-4">
            <Field label="Asunto" htmlFor="asunto"><input id="asunto" className="input" maxLength={200} value={asunto} onChange={(e) => setAsunto(e.target.value)} onFocus={() => setTarget("asunto")} /></Field>
            <div className="flex flex-col gap-2">
              <span className="label">Variables · clic para insertar en {target}</span>
              <div className="flex flex-wrap gap-1.5">
                {VARS.map((v) => <button key={v} type="button" onClick={() => insert(v)} className="min-h-8 cursor-pointer border border-n400 bg-n100 px-2 py-1 font-mono text-xs hover:border-accent hover:text-a700">{v}</button>)}
              </div>
            </div>
            <Field label="Cuerpo" htmlFor="cuerpo"><textarea id="cuerpo" ref={cuerpoRef} className="input !min-h-[300px] !text-[13px] leading-[1.6]" maxLength={5000} value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} onFocus={() => setTarget("cuerpo")} /></Field>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t-2 border-divider p-4">
            <button type="button" className="btn btn-primary" disabled={pending} onClick={() => run(() => guardarPlantillaAction({ asunto, cuerpo }), () => setMsg("Plantilla guardada."))}>Guardar plantilla</button>
            <button type="button" className="btn btn-outline" disabled={pending} onClick={() => run(async () => { const r = await enviarPruebaAction(); return r.ok ? ({ ok: true as const, message: r.message }) : ({ ok: false as const, error: r.message }); }, (r) => setMsg((r as unknown as { message: string }).message))}>Enviar correo de prueba</button>
            {error && <span className="field-err" role="alert">{error}</span>}
          </div>
        </Panel>

        <section className="border border-n300 bg-n200 lg:sticky lg:top-24" aria-label="Vista previa del correo">
          <div className="border-b border-n300 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em]">Vista previa</div>
          <div className="p-5">
            <div className="border border-n300 bg-white">
              <div className="grid grid-cols-[60px_1fr] gap-1 border-b border-n200 px-4 py-3 text-xs">
                <span className="text-muted">De</span><span>DMC Bodega &lt;alertas@dmc.cl&gt;</span>
                <span className="text-muted">Para</span><span>{para.join(", ") || "—"}</span>
                <span className="text-muted">Asunto</span><b>{rep(asunto)}</b>
              </div>
              <div className="h-1 bg-accent" />
              <div className="flex flex-col gap-3 px-[22px] py-5 text-sm leading-relaxed">
                <div className="text-xl font-extrabold tracking-[-0.02em]">Alerta de stock crítico</div>
                {blocks.map((b, i) => b === "tabla" ? (
                  <table key={i} className="w-full border-collapse text-xs">
                    <thead><tr className="bg-n200"><th className="px-2 py-1.5 text-left">Código</th><th className="px-2 py-1.5 text-left">Descripción</th><th className="px-2 py-1.5 text-right">Saldo</th><th className="px-2 py-1.5 text-right">Crítico</th></tr></thead>
                    <tbody>{rojos.map((r) => <tr key={r.cod} className="border-t border-n200"><td className="px-2 py-1.5 font-bold">{r.cod}</td><td className="px-2 py-1.5">{r.desc}</td><td className="px-2 py-1.5 text-right font-bold text-a700">{fmt(r.disp)}</td><td className="px-2 py-1.5 text-right">{fmt(r.crit)}</td></tr>)}</tbody>
                  </table>
                ) : <p key={i} className="m-0 whitespace-pre-wrap">{b.t}</p>)}
              </div>
            </div>
            <p className="mt-2 text-[11px] text-muted">La prueba se enviará a {email} cuando se conecte el servidor de correo.</p>
          </div>
        </section>
      </div>
    </>
  );
}

// ═════════════════════════ Parámetros ═════════════════════════

function Motivos({ title, lista, items }: { title: string; lista: "salida" | "ajuste"; items: string[] }) {
  const [v, setV] = useState("");
  const add = useRun();
  const del = useRun();
  return (
    <Panel title={title}>
      {items.map((m) => (
        <div key={m} className="flex items-center justify-between border-b border-n200 px-4 py-[9px] text-sm">
          <span>{m}</span>
          <button type="button" className="btn btn-ghost btn-sm !text-n700" onClick={() => del.run(() => quitarMotivoAction({ lista, valor: m }))}>Quitar</button>
        </div>
      ))}
      <form className="flex gap-2 px-4 py-3" onSubmit={(e) => { e.preventDefault(); add.run(() => agregarMotivoAction({ lista, valor: v }), () => setV("")); }}>
        <input aria-label="Nuevo motivo" className="input" maxLength={60} value={v} placeholder="Nuevo motivo" onChange={(e) => { setV(e.target.value); add.setError(""); }} />
        <button type="submit" className="btn btn-outline flex-none" disabled={add.pending}>+ Agregar</button>
      </form>
      {(add.error || del.error) && <div className="field-err px-4 pb-3" role="alert">{add.error || del.error}</div>}
    </Panel>
  );
}

export function ParametrosTab({ margen, dias, salida, ajuste }: { margen: number; dias: number; salida: string[]; ajuste: string[] }) {
  const [m, setM] = useState(String(margen));
  const [d, setD] = useState(String(dias));
  const [msg, setMsg] = useState("");
  const { pending, error, run } = useRun();
  return (
    <>
      {msg && <Notice tone="ok">{msg}</Notice>}
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Panel title="Parámetros de stock">
          <div className="flex flex-col gap-4 p-4">
            <Field label="Margen del amarillo sobre el crítico" htmlFor="margen" hint="Amarillo si el saldo está entre el crítico y crítico + margen. Por defecto 5."><input id="margen" className="input !font-bold" type="number" min={0} max={1000} step={1} inputMode="numeric" value={m} onChange={(e) => setM(e.target.value)} /></Field>
            <Field label="Días de vigencia de una reserva" htmlFor="dias" hint="Contados desde la aprobación de la cotización."><input id="dias" className="input !font-bold" type="number" min={1} max={365} step={1} inputMode="numeric" value={d} onChange={(e) => setD(e.target.value)} /></Field>
            {error && <span className="field-err" role="alert">{error}</span>}
          </div>
          <div className="border-t-2 border-divider p-4">
            <button type="button" className="btn btn-primary" disabled={pending} onClick={() => run(() => guardarParametrosAction({ margen: Number(m), dias: Number(d) }), () => setMsg(`Parámetros guardados. El semáforo se recalculó con margen ${m}.`))}>Guardar parámetros</button>
          </div>
        </Panel>
        <Motivos title="Motivos de salida manual" lista="salida" items={salida} />
        <Motivos title="Motivos de ajuste" lista="ajuste" items={ajuste} />
      </div>
    </>
  );
}
