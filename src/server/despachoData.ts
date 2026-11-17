import "server-only";
import { cotInfo, isOpenCot, BODEGAS, type BodCod, type EstadoCot } from "@/lib/domain";
import { daysFromToday, fmtDate } from "@/lib/format";
import { getCotizacion, getProducto, listBodegas, productMap } from "./inventory";

export type DespachoData = {
  id: string;
  estado: EstadoCot;
  cli: string;
  rut: string;
  eje: string;
  aprob: string;
  vence: string;
  dias: number;
  obs: string;
  pct: number;
  abierta: boolean;
  bodegas: { cod: BodCod; nombre: string }[];
  rows: {
    cod: string;
    desc: string;
    inv: boolean;
    cant: number;
    desp: number;
    pend: number;
    stock: Record<BodCod, number>;
    defaultBod: BodCod;
  }[];
};

export function loadDespacho(id: string): DespachoData | null {
  const c = getCotizacion(id);
  if (!c) return null;
  const pm = productMap();
  return {
    id: c.id,
    estado: c.estado,
    cli: c.cli,
    rut: c.rut,
    eje: c.eje,
    aprob: fmtDate(c.aprob),
    vence: fmtDate(c.vence),
    dias: daysFromToday(c.vence),
    obs: c.obs,
    pct: cotInfo(c, pm).pct,
    abierta: isOpenCot(c),
    bodegas: listBodegas().map((b) => ({ cod: b.cod, nombre: b.nombre })),
    rows: c.items.flatMap((it) => {
      const p = getProducto(it.cod);
      if (!p) return [];
      const stock = Object.fromEntries(BODEGAS.map((b) => [b, p.stock[b].disp])) as Record<BodCod, number>;
      const defaultBod = [...BODEGAS].sort((a, b) => stock[b] - stock[a])[0];
      return [{ cod: p.cod, desc: p.desc, inv: p.inv, cant: it.cant, desp: it.desp, pend: it.cant - it.desp, stock, defaultBod }];
    }),
  };
}
