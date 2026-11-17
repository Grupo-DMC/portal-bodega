"use client";

import { useState } from "react";
import { alternarMaestroAction, guardarMaestroAction } from "@/actions/maestros";
import { useRun } from "@/components/controls";
import { Dialog } from "@/components/Dialog";
import { FilterBar } from "@/components/FilterBar";
import { PageHead, StatusBadge } from "@/components/ui";

type Kind = "familias" | "subfamilias" | "bodegas";
type Form = { cod?: string; nombre?: string; desc?: string; fam?: string; dir?: string; resp?: string };
export type MaestroRow = { cod: string; activo: boolean; assoc: number; name: string; cells: string[]; form: Form };
type Opt = { v: string; l: string };

const SING: Record<Kind, string> = { familias: "familia", subfamilias: "subfamilia", bodegas: "bodega" };
const FIELDS: Record<Kind, { k: keyof Form; l: string; sel?: boolean; req?: boolean }[]> = {
  familias: [{ k: "cod", l: "Código", req: true }, { k: "nombre", l: "Nombre", req: true }, { k: "desc", l: "Descripción" }],
  subfamilias: [{ k: "cod", l: "Código", req: true }, { k: "nombre", l: "Nombre", req: true }, { k: "fam", l: "Familia padre *", sel: true, req: true }],
  bodegas: [{ k: "nombre", l: "Nombre", req: true }, { k: "dir", l: "Dirección" }, { k: "resp", l: "Responsable" }],
};

export function MaestroManager({ kind, title, cols, rows, famOpts, famFilter }: { kind: Kind; title: string; cols: { l: string; right?: boolean }[]; rows: MaestroRow[]; famOpts: Opt[]; famFilter: Opt[] | null }) {
  const [drawer, setDrawer] = useState<{ edit: string | null } | null>(null);
  const [form, setForm] = useState<Form>({});
  const [tried, setTried] = useState(false);
  const [conf, setConf] = useState<string | null>(null);
  const save = useRun();
  const toggle = useRun();
  // Las bodegas son fijas mientras se usan datos ficticios (el stock está modelado por bodega).
  const canCreate = kind !== "bodegas";

  const fields = FIELDS[kind];
  const missing = (k: keyof Form, req?: boolean) => tried && req && !String(form[k] ?? "").trim();

  function submit() {
    setTried(true);
    if (fields.some((f) => f.req && !String(form[f.k] ?? "").trim())) return;
    save.run(
      () => guardarMaestroAction({ kind, editing: drawer?.edit ?? null, cod: (form.cod ?? drawer?.edit ?? "").trim().toUpperCase(), nombre: form.nombre ?? "", desc: form.desc ?? "", fam: form.fam ?? "", dir: form.dir ?? "", resp: form.resp ?? "" }),
      () => setDrawer(null),
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHead
        kicker="Maestros"
        title={title}
        actions={canCreate && <button type="button" className="btn btn-primary" onClick={() => { setDrawer({ edit: null }); setForm({}); setTried(false); }}>+ Nueva {SING[kind]}</button>}
      />
      <FilterBar
        className="sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))]"
        fields={[
          { name: "q", label: "Buscar", type: "text", placeholder: "Código o nombre" },
          { name: "est", label: "Estado", type: "select", options: [{ v: "a", l: "Activo" }, { v: "i", l: "Inactivo" }] },
          ...(famFilter ? [{ name: "fam", label: "Familia", type: "select" as const, allLabel: "Todas", options: famFilter }] : []),
        ]}
      />
      <section className="panel" aria-label={title}>
        <div className="table-wrap">
          <table className="tbl min-w-[720px]">
            <thead><tr>{cols.map((c) => <th key={c.l} className={c.right ? "r" : ""}>{c.l}</th>)}<th>Estado</th><th className="r">Acciones</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.cod} className={r.activo ? "" : "opacity-60"}>
                  {r.cells.map((v, i) => <td key={i} className={`${cols[i].right ? "r" : ""} ${i === 0 ? "font-extrabold" : i === 1 ? "" : "text-n700"}`}>{v}</td>)}
                  <td><StatusBadge estado={r.activo ? "Activo" : "Inactivo"} /></td>
                  <td className="whitespace-nowrap text-right">
                    {conf === r.cod ? (
                      <span className="inline-flex flex-wrap items-center justify-end gap-1.5 text-xs">
                        <span className="font-semibold text-a800" role="alert">{r.activo ? (r.assoc ? `Tiene ${r.assoc} productos asociados. ¿Desactivar igual?` : "¿Desactivar?") : "¿Activar?"}</span>
                        {toggle.error && <span className="field-err">{toggle.error}</span>}
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => setConf(null)}>No</button>
                        <button type="button" className="btn btn-primary btn-sm" disabled={toggle.pending} onClick={() => toggle.run(() => alternarMaestroAction({ kind, cod: r.cod }), () => setConf(null))}>Sí</button>
                      </span>
                    ) : (
                      <span className="inline-flex gap-1">
                        <button type="button" className="btn btn-ghost btn-sm !text-ink" onClick={() => { setDrawer({ edit: r.cod }); setForm({ ...r.form }); setTried(false); }}>Editar</button>
                        <button type="button" className="btn btn-ghost btn-sm !text-n700" onClick={() => { toggle.setError(""); setConf(r.cod); }}>{r.activo ? "Desactivar" : "Activar"}</button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <div className="p-8 text-sm text-muted">No hay registros para los filtros elegidos.</div>}
      </section>

      {drawer && (
        <Dialog variant="right" label={`${drawer.edit ? "Editar" : "Nueva"} ${SING[kind]}`} onClose={() => setDrawer(null)}>
          <div className="border-b border-n300 px-6 py-5">
            <div className="kicker mb-1.5">{drawer.edit ? "Editar" : "Nueva"} {SING[kind]}</div>
            <h3 className="text-[28px]">{drawer.edit ? form.nombre || drawer.edit : `${SING[kind][0].toUpperCase()}${SING[kind].slice(1)} sin nombre`}</h3>
          </div>
          <form className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5" onSubmit={(e) => { e.preventDefault(); submit(); }} id="maestro-form">
            {fields.map((f, i) => {
              const bad = missing(f.k, f.req);
              const disabled = f.k === "cod" && !!drawer.edit;
              return (
                <div key={f.k} className="field">
                  <label className="label" htmlFor={`mf-${f.k}`}>{f.l}{f.req && !f.l.endsWith("*") ? " *" : ""}</label>
                  {f.sel ? (
                    <select id={`mf-${f.k}`} className="input" value={form[f.k] ?? ""} aria-invalid={!!bad} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}><option value="">Seleccione…</option>{famOpts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select>
                  ) : (
                    <input id={`mf-${f.k}`} data-autofocus={i === 0 ? "" : undefined} className="input" maxLength={f.k === "cod" ? 10 : 200} value={form[f.k] ?? ""} disabled={disabled} aria-invalid={!!bad} onChange={(e) => setForm({ ...form, [f.k]: f.k === "cod" ? e.target.value.toUpperCase() : e.target.value })} />
                  )}
                  {bad && <span className="field-err" role="alert">Campo obligatorio.</span>}
                </div>
              );
            })}
            {save.error && <span className="field-err" role="alert">{save.error}</span>}
          </form>
          <div className="flex gap-2 border-t-2 border-divider px-6 py-4">
            <button type="submit" form="maestro-form" className="btn btn-primary flex-1 !justify-between" disabled={save.pending}>{save.pending ? "Guardando…" : "Guardar"} <span aria-hidden>→</span></button>
            <button type="button" className="btn btn-outline" onClick={() => setDrawer(null)}>Cancelar</button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
