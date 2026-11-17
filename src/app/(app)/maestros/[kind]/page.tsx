import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BODEGAS } from "@/lib/domain";
import { fmt } from "@/lib/format";
import { oneOf, pick, type SP } from "@/lib/params";
import { requirePermission } from "@/server/auth";
import { listBodegas, listFamilias, listProductos, listSubfamilias, nombreFamilia } from "@/server/inventory";
import { MaestroManager, type MaestroRow } from "./MaestroManager";

const KINDS = ["familias", "subfamilias", "bodegas"] as const;
type Kind = (typeof KINDS)[number];
const TITLE: Record<Kind, string> = { familias: "Familias", subfamilias: "Subfamilias", bodegas: "Bodegas" };

export async function generateMetadata({ params }: { params: Promise<{ kind: string }> }): Promise<Metadata> {
  const k = (await params).kind as Kind;
  return { title: TITLE[k] ?? "Maestros" };
}

export default async function MaestroPage({ params, searchParams }: { params: Promise<{ kind: string }>; searchParams: Promise<SP> }) {
  await requirePermission("maestros");
  const kind = (await params).kind as Kind;
  if (!KINDS.includes(kind)) notFound();
  const sp = await searchParams;
  const q = pick(sp, "q").toLowerCase();
  const est = oneOf(pick(sp, "est", 1), ["a", "i"] as const);
  const fam = oneOf(pick(sp, "fam", 10), listFamilias().map((f) => f.cod));
  const prods = listProductos();
  const nProd = (k: "fam" | "sub", v: string) => prods.filter((p) => p[k] === v).length;

  let rows: MaestroRow[];
  let cols: { l: string; right?: boolean }[];
  if (kind === "familias") {
    cols = [{ l: "Código" }, { l: "Nombre" }, { l: "Descripción" }, { l: "N° subfamilias", right: true }, { l: "N° productos", right: true }];
    rows = listFamilias().map((f) => ({ cod: f.cod, activo: f.activo, assoc: nProd("fam", f.cod), name: f.nombre, cells: [f.cod, f.nombre, f.desc, String(listSubfamilias().filter((s) => s.fam === f.cod).length), String(nProd("fam", f.cod))], form: { cod: f.cod, nombre: f.nombre, desc: f.desc } }));
  } else if (kind === "subfamilias") {
    cols = [{ l: "Código" }, { l: "Nombre" }, { l: "Familia padre" }, { l: "N° productos", right: true }];
    rows = listSubfamilias().filter((s) => !fam || s.fam === fam).map((s) => ({ cod: s.cod, activo: s.activo, assoc: nProd("sub", s.cod), name: s.nombre, cells: [s.cod, s.nombre, nombreFamilia(s.fam), String(nProd("sub", s.cod))], form: { cod: s.cod, nombre: s.nombre, fam: s.fam } }));
  } else {
    cols = [{ l: "Código" }, { l: "Nombre" }, { l: "Dirección" }, { l: "Responsable" }, { l: "Productos con stock", right: true }, { l: "Stock total", right: true }];
    rows = listBodegas().map((b) => {
      const ps = prods.filter((p) => p.inv && BODEGAS.includes(b.cod) && p.stock[b.cod].disp > 0);
      return { cod: b.cod, activo: b.activo, assoc: ps.length, name: b.nombre, cells: [b.cod, b.nombre, b.dir, b.resp, String(ps.length), fmt(ps.reduce((a, p) => a + p.stock[b.cod].disp, 0))], form: { cod: b.cod, nombre: b.nombre, dir: b.dir, resp: b.resp } };
    });
  }
  rows = rows.filter((r) => (!q || `${r.cod} ${r.name}`.toLowerCase().includes(q)) && (!est || (est === "a") === r.activo));

  return (
    <MaestroManager
      key={kind}
      kind={kind}
      title={TITLE[kind]}
      cols={cols}
      rows={rows}
      famOpts={listFamilias().filter((f) => f.activo).map((f) => ({ v: f.cod, l: f.nombre }))}
      famFilter={kind === "subfamilias" ? listFamilias().map((f) => ({ v: f.cod, l: f.nombre })) : null}
    />
  );
}
