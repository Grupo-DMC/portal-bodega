import { daysFromToday } from "./format";

export const BODEGAS = ["BC", "BT", "BTR"] as const;
export type BodCod = (typeof BODEGAS)[number];

export type Rol = "Admin" | "Bodeguero" | "Ventas";

export type StockCell = { disp: number; rev: number; dan: number };

export type Medidas = {
  tipo: "Producto" | "Embalaje";
  l: number | null;
  a: number | null;
  h: number | null;
  u: "cm" | "mm" | "m";
  peso: number | null;
  pu: "kg" | "g";
};

export type Producto = {
  cod: string;
  desc: string;
  fam: string;
  sub: string;
  um: string;
  formato: string;
  inv: boolean;
  crit: number;
  transito: number;
  stock: Record<BodCod, StockCell>;
  ult: string; // ISO o ""
  med: Medidas | null;
  activo: boolean;
};

export type Familia = { cod: string; nombre: string; desc: string; activo: boolean };
export type Subfamilia = { cod: string; nombre: string; fam: string; activo: boolean };
export type Bodega = { cod: BodCod; nombre: string; dir: string; resp: string; activo: boolean };

export type EstadoCot = "Pendiente" | "Parcial" | "Completa" | "Vencida" | "Cerrada";
export type ItemCot = { cod: string; cant: number; desp: number };
export type Cotizacion = {
  id: string;
  cli: string;
  rut: string;
  eje: string;
  aprob: string;
  vence: string;
  estado: EstadoCot;
  obs: string;
  items: ItemCot[];
};

export type Despacho = {
  id: string;
  cot: string;
  fecha: string;
  hora: string;
  guia: string;
  oc: string;
  hep: string;
  user: string;
  obs: string;
  lines: { cod: string; cant: number; bod: BodCod }[];
};

export const TIPOS_MOV = ["Entrada packing", "Devolución", "Despacho cot", "Salida manual", "Ajuste conteo", "Cambio de estado"] as const;
export type TipoMov = (typeof TIPOS_MOV)[number];
export type Movimiento = {
  id: number;
  fecha: string;
  hora: string;
  tipo: TipoMov;
  cod: string;
  cant: number;
  bod: BodCod;
  doc: string;
  cot: string;
  cli: string;
  motivo: string;
  user: string;
  saldo: number;
};

export type Revision = { id: string; cod: string; cant: number; cli: string; guia: string; fecha: string; motivo: string; bod: BodCod };

export type EstadoConteo = "Borrador" | "En conteo" | "Por aprobar" | "Aplicado";
export type Conteo = {
  id: string;
  bod: BodCod;
  fam: string;
  fecha: string;
  estado: EstadoConteo;
  user: string;
  items: number;
  dif: number | null;
  counts: Record<string, number>;
};

export type Config = {
  margen: number;
  diasReserva: number;
  frecuencia: "inmediata" | "diaria";
  hora: string;
  amarillo: boolean;
  destinatarios: { mail: string; activo: boolean }[];
  asunto: string;
  cuerpo: string;
  motivosSalida: string[];
  motivosAjuste: string[];
};

export type Usuario = { username: string; nombre: string; rol: Rol; email: string };

// ───────────────────────── Cálculos puros ─────────────────────────

export type Sem = "rojo" | "amarillo" | "verde";

export const SEM_META: Record<Sem, { label: string; ord: number }> = {
  rojo: { label: "Bajo crítico", ord: 0 },
  amarillo: { label: "Cerca del crítico", ord: 1 },
  verde: { label: "Sobre el crítico", ord: 2 },
};

export function semOf(disp: number, crit: number, margen: number): Sem {
  if (disp < crit) return "rojo";
  if (disp <= crit + margen) return "amarillo";
  return "verde";
}

export const isOpenCot = (c: Cotizacion) => c.estado === "Pendiente" || c.estado === "Parcial";

export type Reserva = { cot: string; cli: string; eje: string; qty: number; vence: string; dias: number };

export function reservasDe(cots: Cotizacion[], cod: string): Reserva[] {
  const out: Reserva[] = [];
  for (const c of cots) {
    if (!isOpenCot(c)) continue;
    for (const it of c.items) {
      if (it.cod === cod && it.cant - it.desp > 0) {
        out.push({ cot: c.id, cli: c.cli, eje: c.eje, qty: it.cant - it.desp, vence: c.vence, dias: daysFromToday(c.vence) });
      }
    }
  }
  return out;
}

export type Totales = { disp: number; rev: number; dan: number; res: number; libre: number; trans: number; sem: Sem };

export function totales(p: Producto, cots: Cotizacion[], margen: number, bod?: BodCod | ""): Totales {
  const bs: readonly BodCod[] = bod ? [bod] : BODEGAS;
  let disp = 0;
  let rev = 0;
  let dan = 0;
  for (const b of bs) {
    disp += p.stock[b].disp;
    rev += p.stock[b].rev;
    dan += p.stock[b].dan;
  }
  const res = reservasDe(cots, p.cod).reduce((a, r) => a + r.qty, 0);
  return { disp, rev, dan, res, libre: disp - res, trans: p.transito, sem: semOf(disp, p.crit, margen) };
}

export function cotInfo(c: Cotizacion, prods: Map<string, Producto>) {
  let cant = 0;
  let desp = 0;
  let pendItems = 0;
  for (const it of c.items) {
    const p = prods.get(it.cod);
    if (!p || !p.inv) continue;
    cant += it.cant;
    desp += it.desp;
    if (it.cant > it.desp) pendItems++;
  }
  return { cant, desp, pct: cant ? Math.round((desp / cant) * 100) : 0, pendItems };
}

export type Tone = "neutral" | "warn" | "ok" | "danger" | "dark" | "info" | "dangerDark" | "outline" | "muted";

export const BADGE_TONE: Record<string, Tone> = {
  Pendiente: "neutral",
  Parcial: "warn",
  Completa: "ok",
  Vencida: "danger",
  Cerrada: "dark",
  "En revisión": "info",
  Dañado: "dangerDark",
  "No inventariable": "outline",
  Activo: "ok",
  Inactivo: "muted",
  Borrador: "outline",
  "En conteo": "info",
  "Por aprobar": "warn",
  Aplicado: "ok",
  "Sin cobertura": "danger",
  Cubierta: "ok",
  Enviada: "ok",
  "No enviada": "neutral",
};
