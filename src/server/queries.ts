import "server-only";
import { BODEGAS, type BodCod, type Movimiento, type Producto, type Sem, type Totales } from "@/lib/domain";
import { daysFromToday } from "@/lib/format";
import { oneOf, pick, type SP } from "@/lib/params";
import { TIPOS_MOV } from "@/lib/domain";
import { getConfig, listMovimientos, listProductos, getProducto, nombreFamilia, nombreSubfamilia, nombreBodega, totalesDe } from "./inventory";
import { listFamilias, listSubfamilias } from "./inventory";

/** Consultas con filtros compartidas por las páginas y las exportaciones CSV (misma lógica = mismo resultado). */

export type InvFilters = { q: string; fam: string; sub: string; bod: BodCod | ""; sem: Sem | "" };

export function parseInvFilters(sp: SP): InvFilters {
  const fam = oneOf(pick(sp, "fam", 10), listFamilias().map((f) => f.cod));
  return {
    q: pick(sp, "q"),
    fam,
    sub: oneOf(pick(sp, "sub", 10), listSubfamilias().filter((s) => !fam || s.fam === fam).map((s) => s.cod)),
    bod: oneOf(pick(sp, "bod", 4), BODEGAS),
    sem: oneOf(pick(sp, "sem", 10), ["rojo", "amarillo", "verde"] as const),
  };
}

export function queryInventario(f: InvFilters): { p: Producto; t: Totales }[] {
  const q = f.q.toLowerCase();
  return listProductos()
    .filter((p) => p.inv && p.activo)
    .map((p) => ({ p, t: totalesDe(p, f.bod) }))
    .filter(
      ({ p, t }) =>
        (!q || `${p.cod} ${p.desc}`.toLowerCase().includes(q)) && (!f.fam || p.fam === f.fam) && (!f.sub || p.sub === f.sub) && (!f.sem || t.sem === f.sem),
    );
}

export type MovFilters = { cod: string; tipo: string; user: string; cli: string; cot: string; bod: BodCod | ""; rango: string };

export function parseMovFilters(sp: SP): MovFilters {
  const rango = pick(sp, "rango", 3);
  return {
    cod: pick(sp, "cod"),
    tipo: oneOf(pick(sp, "tipo", 20), TIPOS_MOV),
    user: pick(sp, "user"),
    cli: pick(sp, "cli", 120),
    cot: pick(sp, "cot", 20),
    bod: oneOf(pick(sp, "bod", 4), BODEGAS),
    rango: ["0", "7", "30"].includes(rango) ? rango : "",
  };
}

export function queryMovimientos(f: MovFilters): Movimiento[] {
  const cq = f.cod.toLowerCase();
  const tq = f.cot.toLowerCase();
  return listMovimientos().filter((m) => {
    if (cq && !`${m.cod} ${getProducto(m.cod)?.desc ?? ""}`.toLowerCase().includes(cq)) return false;
    if (tq && !m.cot.toLowerCase().includes(tq)) return false;
    if (f.tipo && m.tipo !== f.tipo) return false;
    if (f.user && m.user !== f.user) return false;
    if (f.cli && m.cli !== f.cli) return false;
    if (f.bod && m.bod !== f.bod) return false;
    if (f.rango !== "" && -daysFromToday(m.fecha) > Number(f.rango)) return false;
    return true;
  });
}

export function inventarioCsvRows(rows: { p: Producto; t: Totales }[]) {
  const label = { rojo: "Bajo crítico", amarillo: "Cerca del crítico", verde: "Sobre el crítico" } as const;
  return [
    ["Código", "Descripción", "Familia", "Subfamilia", "Disponible", "Reservado", "Libre", "En revisión", "En tránsito", "Stock crítico", "Semáforo"],
    ...rows.map(({ p, t }) => [p.cod, p.desc, nombreFamilia(p.fam), p.sub ? nombreSubfamilia(p.sub) : "", t.disp, t.res, t.libre, t.rev, t.trans, p.crit, label[t.sem]]),
  ];
}

export function movimientosCsvRows(rows: Movimiento[]) {
  return [
    ["Fecha", "Hora", "Tipo", "Producto", "Cantidad", "Bodega", "Documento", "N° COT", "Cliente", "Motivo", "Usuario", "Saldo resultante"],
    ...rows.map((m) => [m.fecha.split("-").reverse().join("/"), m.hora, m.tipo, m.cod, m.cant, nombreBodega(m.bod), m.doc, m.cot, m.cli, m.motivo, m.user, m.saldo]),
  ];
}

export const margen = () => getConfig().margen;
