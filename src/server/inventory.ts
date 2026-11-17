import "server-only";
import { daysFromToday, nowHM, todayISO, addDays } from "@/lib/format";
import {
  BODEGAS,
  cotInfo,
  isOpenCot,
  totales,
  type Bodega,
  type BodCod,
  type Config,
  type Conteo,
  type Cotizacion,
  type Despacho,
  type EstadoCot,
  type Familia,
  type Medidas,
  type Movimiento,
  type Producto,
  type Revision,
  type Subfamilia,
} from "@/lib/domain";
import { store } from "./store";

/**
 * Capa de acceso a datos + reglas de negocio.
 * HOY lee/escribe el almacén ficticio (store.ts). Para conectar SQL Server basta con
 * reimplementar estas funciones con consultas parametrizadas (ver src/server/db/mssql.ts
 * y db/schema.sql); páginas y acciones no cambian.
 */

export type Res<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

// ═════════════════════════ Lecturas ═════════════════════════

export const getConfig = (): Config => store.config;
export const listFamilias = (): Familia[] => store.familias;
export const listSubfamilias = (): Subfamilia[] => store.subfamilias;
export const listBodegas = (): Bodega[] => store.bodegas;
export const listProductos = (): Producto[] => store.productos;
export const getProducto = (cod: string): Producto | undefined => store.productos.find((p) => p.cod === cod);
export const productMap = (): Map<string, Producto> => new Map(store.productos.map((p) => [p.cod, p]));
export const listMovimientos = (): Movimiento[] => store.movimientos;
export const listDespachos = (): Despacho[] => store.despachos;
export const getDespacho = (id: string): Despacho | undefined => store.despachos.find((d) => d.id === id);
export const listRevision = (): Revision[] => store.revision;
export const listConteos = (): Conteo[] => store.conteos;
export const getConteo = (id: string): Conteo | undefined => store.conteos.find((c) => c.id === id);
export const alertasEnviadas = () => store.alertasEnviadas;
export const nombreBodega = (cod: string) => store.bodegas.find((b) => b.cod === cod)?.nombre ?? cod;
export const nombreFamilia = (cod: string) => store.familias.find((f) => f.cod === cod)?.nombre ?? "—";
export const nombreSubfamilia = (cod: string) => store.subfamilias.find((f) => f.cod === cod)?.nombre ?? "—";

/** Una cotización abierta cuya fecha de vencimiento ya pasó se considera Vencida (no despachable ni reserva). */
function withEffective(c: Cotizacion): Cotizacion {
  if (isOpenCot(c) && daysFromToday(c.vence) < 0) return { ...c, estado: "Vencida" };
  return c;
}
export const listCotizaciones = (): Cotizacion[] => store.cotizaciones.map(withEffective);
export const getCotizacion = (id: string): Cotizacion | undefined => {
  const c = store.cotizaciones.find((x) => x.id === id);
  return c && withEffective(c);
};

export function totalesDe(p: Producto, bod?: BodCod | "") {
  return totales(p, listCotizaciones(), store.config.margen, bod);
}

/** Serie diaria de entradas/salidas. DATOS DE DEMOSTRACIÓN: en SQL será un GROUP BY sobre Movimiento. */
export function actividadDiaria(dias: number) {
  const out: { fecha: string; inn: number; out: number }[] = [];
  const hoy = todayISO();
  for (let i = dias - 1; i >= 0; i--) {
    const fecha = addDays(hoy, -i);
    const d = new Date(`${fecha}T12:00:00Z`);
    const dow = d.getUTCDay();
    const we = dow === 0 || dow === 6;
    const s = Math.abs(Math.sin((d.getUTCDate() * 13 + d.getUTCMonth() * 7) * 1.7));
    const c = Math.abs(Math.cos((d.getUTCDate() * 5 + d.getUTCMonth() * 3) * 2.3));
    out.push({ fecha, inn: we ? 0 : Math.round(1 + s * 5), out: we ? (dow === 6 ? 1 : 0) : Math.round(2 + c * 7) });
  }
  return out;
}

export const TOP_DESPACHADOS: [string, number][] = [
  ["SD51", 18], ["SD52", 16], ["MAT-01", 15], ["ETQ-AM58", 12], ["DES-01", 9], ["CP-01", 7], ["ETQ-RF82", 6], ["CAB-UTP", 5], ["DES-REM", 4], ["SD60", 3],
];

// ═════════════════════════ Utilidades internas ═════════════════════════

function pushMov(m: Omit<Movimiento, "id" | "fecha" | "hora" | "saldo"> & { saldo?: number }): void {
  const p = getProducto(m.cod);
  store.movimientos.unshift({
    ...m,
    id: ++store.seq.mov,
    fecha: todayISO(),
    hora: nowHM(),
    saldo: m.saldo ?? (p ? p.stock.BC.disp + p.stock.BT.disp + p.stock.BTR.disp : 0),
  });
}
const sumDisp = (p: Producto) => BODEGAS.reduce((a, b) => a + p.stock[b].disp, 0);
const docStr = (d: { guia?: string; oc?: string; hep?: string }) =>
  [d.guia && `Guía ${d.guia}`, d.oc && `OC ${d.oc}`, d.hep && `HEP ${d.hep}`].filter(Boolean).join(" · ");
const pad = (n: number, w = 4) => String(n).padStart(w, "0");

// ═════════════════════════ Despacho por cotización ═════════════════════════

export type DespachoInput = {
  cot: string;
  lines: { cod: string; bod: BodCod; qty: number }[];
  guia: string;
  oc: string;
  hep: string;
  obs: string;
};

export function despachar(input: DespachoInput, user: string): Res<{ despachoId: string; estado: EstadoCot; lineas: number }> {
  const raw = store.cotizaciones.find((c) => c.id === input.cot);
  if (!raw) return fail("La cotización no existe.");
  const c = withEffective(raw);
  if (!isOpenCot(c)) return fail(`No se puede despachar una cotización en estado ${c.estado}.`);
  if (!input.guia && !input.oc && !input.hep) return fail("Debe ingresar al menos un documento: Guía, OC o HEP.");
  if (!input.lines.length) return fail("No hay ítems para despachar.");

  const seen = new Set<string>();
  // 1) Validar TODO antes de tocar el stock (todo o nada).
  for (const l of input.lines) {
    if (seen.has(l.cod)) return fail(`El producto ${l.cod} está repetido en el despacho.`);
    seen.add(l.cod);
    const it = raw.items.find((i) => i.cod === l.cod);
    const p = getProducto(l.cod);
    if (!it || !p) return fail(`El producto ${l.cod} no pertenece a la cotización.`);
    if (!p.inv) return fail(`${l.cod} no es inventariable y no se despacha.`);
    if (!p.activo) return fail(`${l.cod} está inactivo.`);
    if (!Number.isInteger(l.qty) || l.qty <= 0) return fail(`Cantidad inválida para ${l.cod}.`);
    if (l.qty > it.cant - it.desp) return fail(`${l.cod}: supera lo pendiente (${it.cant - it.desp}).`);
    if (l.qty > p.stock[l.bod].disp) return fail(`${l.cod}: supera el stock de ${nombreBodega(l.bod)} (${p.stock[l.bod].disp}). El saldo no puede quedar negativo.`);
  }
  // 2) Aplicar.
  const docs = docStr(input);
  for (const l of input.lines) {
    const p = getProducto(l.cod)!;
    p.stock[l.bod].disp -= l.qty;
    raw.items.find((i) => i.cod === l.cod)!.desp += l.qty;
    pushMov({ tipo: "Despacho cot", cod: l.cod, cant: -l.qty, bod: l.bod, doc: docs, cot: raw.id, cli: raw.cli, motivo: input.obs, user });
  }
  const prods = productMap();
  for (const it of raw.items) {
    const p = prods.get(it.cod);
    if (p && !p.inv) it.desp = it.cant; // servicios: se dan por entregados
  }
  raw.estado = cotInfo(raw, prods).pendItems ? "Parcial" : "Completa";
  const id = `DSP-${pad(++store.seq.desp)}`;
  store.despachos.unshift({
    id, cot: raw.id, fecha: todayISO(), hora: nowHM(), guia: input.guia, oc: input.oc, hep: input.hep, user, obs: input.obs,
    lines: input.lines.map((l) => ({ cod: l.cod, cant: l.qty, bod: l.bod })),
  });
  return { ok: true, despachoId: id, estado: raw.estado, lineas: input.lines.length };
}

export function cerrarCotizacion(id: string, motivo: string): Res {
  const c = store.cotizaciones.find((x) => x.id === id);
  if (!c) return fail("La cotización no existe.");
  if (c.estado !== "Parcial") return fail("Solo se puede cerrar con saldo una cotización en estado Parcial.");
  c.estado = "Cerrada";
  c.obs = `Cerrada con saldo: ${motivo}`;
  return { ok: true };
}

// ═════════════════════════ Entradas ═════════════════════════

export type PackingInput = {
  prov: string;
  pl: string;
  fac: string;
  bod: BodCod;
  lines: { cod: string; qty: number }[];
};

export function validarLineaIngreso(cod: string, qty: number): string | null {
  const p = getProducto(cod.trim().toUpperCase());
  if (!cod.trim()) return "Ingrese un código";
  if (!p) return "Código inexistente";
  if (!p.inv) return "Producto no inventariable";
  if (!p.activo) return "Producto inactivo";
  if (!Number.isInteger(qty) || qty <= 0) return "Cantidad inválida";
  return null;
}

export function ingresarPacking(input: PackingInput, user: string): Res<{ productos: number; unidades: number; omitidas: number }> {
  let productos = 0;
  let unidades = 0;
  let omitidas = 0;
  for (const l of input.lines) {
    const cod = l.cod.trim().toUpperCase();
    if (validarLineaIngreso(cod, l.qty)) {
      omitidas++;
      continue;
    }
    const p = getProducto(cod)!;
    p.stock[input.bod].disp += l.qty;
    p.ult = todayISO();
    pushMov({ tipo: "Entrada packing", cod, cant: l.qty, bod: input.bod, doc: `${input.pl} · ${input.fac}`, cot: "", cli: "", motivo: input.prov, user });
    productos++;
    unidades += l.qty;
  }
  if (!productos) return fail("No hay filas válidas para ingresar.");
  return { ok: true, productos, unidades, omitidas };
}

export type DevolucionInput = { guia: string; cli: string; cot: string; motivo: string; lines: { cod: string; qty: number }[] };

export function registrarDevolucion(input: DevolucionInput, user: string): Res<{ productos: number }> {
  for (const l of input.lines) {
    const p = getProducto(l.cod);
    if (!p) return fail(`El código ${l.cod} no existe.`);
    if (!p.inv) return fail(`${l.cod} no es inventariable.`);
    if (!Number.isInteger(l.qty) || l.qty <= 0) return fail(`Cantidad inválida para ${l.cod}.`);
  }
  for (const l of input.lines) {
    const p = getProducto(l.cod)!;
    p.stock.BC.rev += l.qty;
    store.revision.push({ id: `DEV-${pad(++store.seq.dev)}`, cod: l.cod, cant: l.qty, cli: input.cli, guia: input.guia, fecha: todayISO(), motivo: input.motivo, bod: "BC" });
    pushMov({ tipo: "Devolución", cod: l.cod, cant: l.qty, bod: "BC", doc: `Guía ${input.guia}`, cot: input.cot, cli: input.cli, motivo: `${input.motivo} · queda en revisión`, user });
  }
  return { ok: true, productos: input.lines.length };
}

export function aplicarRevision(id: string, ok: number, dan: number, bod: BodCod, obs: string, user: string): Res<{ cod: string }> {
  const idx = store.revision.findIndex((r) => r.id === id);
  if (idx < 0) return fail("La devolución ya no está en revisión.");
  const r = store.revision[idx];
  if (ok < 0 || dan < 0 || !Number.isInteger(ok) || !Number.isInteger(dan)) return fail("Las cantidades deben ser enteros positivos.");
  if (ok + dan !== r.cant) return fail(`La suma debe ser ${r.cant}.`);
  const p = getProducto(r.cod);
  if (!p) return fail("El producto no existe.");
  p.stock[r.bod].rev = Math.max(p.stock[r.bod].rev - r.cant, 0);
  p.stock[bod].disp += ok;
  p.stock[bod].dan += dan;
  const extra = obs ? ` · ${obs}` : "";
  if (ok) pushMov({ tipo: "Cambio de estado", cod: r.cod, cant: ok, bod, doc: `Revisión ${r.id}`, cot: "", cli: r.cli, motivo: `En revisión → Disponible${extra}`, user });
  if (dan) pushMov({ tipo: "Cambio de estado", cod: r.cod, cant: -dan, bod, doc: `Revisión ${r.id}`, cot: "", cli: r.cli, motivo: `En revisión → Dañado${extra}`, user });
  store.revision.splice(idx, 1);
  return { ok: true, cod: r.cod };
}

// ═════════════════════════ Salida manual ═════════════════════════

export type SalidaInput = {
  lines: { cod: string; bod: BodCod; qty: number }[];
  guia: string;
  oc: string;
  hep: string;
  cli: string;
  motivo: string;
  det: string;
};

export function salidaManual(input: SalidaInput, user: string): Res<{ lineas: number; doc: string }> {
  if (!store.config.motivosSalida.includes(input.motivo)) return fail("Seleccione un motivo del catálogo.");
  if (input.motivo === "Otro" && !input.det) return fail("Con motivo “Otro” el detalle es obligatorio.");
  if (!input.guia && !input.oc && !input.hep) return fail("Ingrese al menos un documento: Guía, OC o HEP.");
  if (!input.lines.length) return fail("Agregue al menos un producto.");
  // Validar acumulando por (producto, bodega) para que dos filas iguales no superen el stock.
  const acc = new Map<string, number>();
  for (const l of input.lines) {
    const p = getProducto(l.cod);
    if (!p || !p.inv || !p.activo) return fail(`El producto ${l.cod} no es válido para salida.`);
    if (!Number.isInteger(l.qty) || l.qty <= 0) return fail(`Cantidad inválida para ${l.cod}.`);
    const k = `${l.cod}|${l.bod}`;
    const total = (acc.get(k) ?? 0) + l.qty;
    acc.set(k, total);
    if (total > p.stock[l.bod].disp) return fail(`${l.cod}: supera el stock de ${nombreBodega(l.bod)} (${p.stock[l.bod].disp}). El saldo no puede quedar negativo.`);
  }
  const doc = docStr(input);
  for (const l of input.lines) {
    getProducto(l.cod)!.stock[l.bod].disp -= l.qty;
    pushMov({ tipo: "Salida manual", cod: l.cod, cant: -l.qty, bod: l.bod, doc, cot: "", cli: input.cli, motivo: input.motivo + (input.det ? ` · ${input.det}` : ""), user });
  }
  return { ok: true, lineas: input.lines.length, doc };
}

// ═════════════════════════ Toma de inventario ═════════════════════════

export function productosDelConteo(c: Conteo): Producto[] {
  return store.productos.filter((p) => {
    if (!p.inv || !p.activo) return false;
    if (c.fam && p.fam !== c.fam) return false;
    if (c.fam) return true;
    const s = p.stock[c.bod];
    return s.disp + s.rev + s.dan > 0 || p.cod in c.counts;
  });
}

export function crearConteo(bod: BodCod, fam: string, fecha: string, user: string): Res<{ id: string }> {
  if (fam && !store.familias.some((f) => f.cod === fam && f.activo)) return fail("La familia no es válida.");
  const id = `CNT-${pad(++store.seq.cnt)}`;
  store.conteos.unshift({ id, bod, fam, fecha, estado: "Borrador", user, items: 0, dif: null, counts: {} });
  return { ok: true, id };
}

export function guardarConteos(id: string, counts: Record<string, number | null>): Res {
  const c = getConteo(id);
  if (!c) return fail("El conteo no existe.");
  if (c.estado !== "En conteo") return fail("Solo se puede contar mientras el conteo está En conteo.");
  const valid = new Set(productosDelConteo(c).map((p) => p.cod));
  const next: Record<string, number> = {};
  for (const [cod, v] of Object.entries(counts)) {
    if (!valid.has(cod)) return fail(`El producto ${cod} no pertenece a este conteo.`);
    if (v === null) continue;
    if (!Number.isInteger(v) || v < 0) return fail(`Cantidad inválida para ${cod}.`);
    next[cod] = v;
  }
  c.counts = next;
  c.items = Object.keys(next).length;
  return { ok: true };
}

export function avanzarConteo(id: string, user: string, puedeAprobar: boolean): Res<{ estado: Conteo["estado"] }> {
  const c = getConteo(id);
  if (!c) return fail("El conteo no existe.");
  if (c.estado === "Borrador") {
    c.estado = "En conteo";
  } else if (c.estado === "En conteo") {
    if (!Object.keys(c.counts).length) return fail("Cuente al menos un producto antes de enviar a aprobación.");
    c.estado = "Por aprobar";
  } else if (c.estado === "Por aprobar") {
    if (!puedeAprobar) return fail("Solo un administrador puede aprobar y aplicar los ajustes.");
    let net = 0;
    for (const [cod, counted] of Object.entries(c.counts)) {
      const p = getProducto(cod);
      if (!p) continue;
      const d = counted - p.stock[c.bod].disp;
      if (!d) continue;
      p.stock[c.bod].disp = counted;
      net += d;
      pushMov({ tipo: "Ajuste conteo", cod, cant: d, bod: c.bod, doc: `Conteo ${c.id}`, cot: "", cli: "", motivo: "Conteo físico", user });
    }
    c.dif = net;
    c.items = Object.keys(c.counts).length;
    c.estado = "Aplicado";
  } else {
    return fail("El conteo ya fue aplicado.");
  }
  return { ok: true, estado: c.estado };
}

// ═════════════════════════ Productos ═════════════════════════

export type ProductoInput = {
  cod: string;
  desc: string;
  fam: string;
  sub: string;
  um: string;
  formato: string;
  inv: boolean;
  activo: boolean;
  crit: number;
  med: Medidas | null;
  stock: { bod: BodCod; qty: number }[];
};

export function guardarProducto(input: ProductoInput, editing: boolean, user: string): Res<{ cod: string }> {
  if (!store.familias.some((f) => f.cod === input.fam)) return fail("Seleccione una familia válida.");
  if (input.sub && !store.subfamilias.some((s) => s.cod === input.sub && s.fam === input.fam)) return fail("La subfamilia no pertenece a la familia elegida.");
  const exists = getProducto(input.cod);
  if (editing) {
    if (!exists) return fail("El producto no existe.");
    if (!input.inv && sumDisp(exists) + BODEGAS.reduce((a, b) => a + exists.stock[b].rev, 0) > 0) {
      return fail("No puede marcarse como no inventariable mientras tenga stock.");
    }
    Object.assign(exists, {
      desc: input.desc, fam: input.fam, sub: input.sub, um: input.um, formato: input.formato, inv: input.inv, activo: input.activo,
      crit: input.inv ? input.crit : 0, med: input.med,
    });
    return { ok: true, cod: exists.cod };
  }
  if (exists || store.productos.some((p) => p.cod.toLowerCase() === input.cod.toLowerCase())) return fail(`Ya existe un producto con el código ${input.cod}.`);
  const p: Producto = {
    cod: input.cod, desc: input.desc, fam: input.fam, sub: input.sub, um: input.um, formato: input.formato, inv: input.inv, activo: input.activo,
    crit: input.inv ? input.crit : 0, transito: 0, ult: "", med: input.med,
    stock: { BC: { disp: 0, rev: 0, dan: 0 }, BT: { disp: 0, rev: 0, dan: 0 }, BTR: { disp: 0, rev: 0, dan: 0 } },
  };
  store.productos.push(p);
  if (input.inv) {
    for (const s of input.stock) {
      if (s.qty > 0) {
        p.stock[s.bod].disp += s.qty;
        p.ult = todayISO();
        pushMov({ tipo: "Entrada packing", cod: p.cod, cant: s.qty, bod: s.bod, doc: "Stock inicial", cot: "", cli: "", motivo: "Alta de producto", user });
      }
    }
  }
  return { ok: true, cod: p.cod };
}

export function alternarProducto(cod: string): Res<{ activo: boolean }> {
  const p = getProducto(cod);
  if (!p) return fail("El producto no existe.");
  p.activo = !p.activo;
  return { ok: true, activo: p.activo };
}

export function setFoto(cod: string, mime: string, data: Buffer): Res {
  if (!getProducto(cod)) return fail("El producto no existe.");
  store.fotos.set(cod, { mime, data });
  return { ok: true };
}
export const getFoto = (cod: string) => store.fotos.get(cod);
export const quitarFoto = (cod: string) => void store.fotos.delete(cod);

// ═════════════════════════ Maestros ═════════════════════════

export type MaestroKind = "familias" | "subfamilias" | "bodegas";

export function guardarMaestro(
  kind: MaestroKind,
  editing: string | null,
  data: { cod: string; nombre: string; desc?: string; fam?: string; dir?: string; resp?: string },
): Res {
  if (kind === "familias") {
    if (editing) {
      const f = store.familias.find((x) => x.cod === editing);
      if (!f) return fail("La familia no existe.");
      Object.assign(f, { nombre: data.nombre, desc: data.desc ?? "" });
    } else {
      if (store.familias.some((x) => x.cod.toLowerCase() === data.cod.toLowerCase())) return fail("El código ya existe.");
      store.familias.push({ cod: data.cod, nombre: data.nombre, desc: data.desc ?? "", activo: true });
    }
  } else if (kind === "subfamilias") {
    if (!data.fam || !store.familias.some((f) => f.cod === data.fam && f.activo)) return fail("Seleccione una familia padre activa.");
    if (editing) {
      const s = store.subfamilias.find((x) => x.cod === editing);
      if (!s) return fail("La subfamilia no existe.");
      Object.assign(s, { nombre: data.nombre, fam: data.fam });
    } else {
      if (store.subfamilias.some((x) => x.cod.toLowerCase() === data.cod.toLowerCase())) return fail("El código ya existe.");
      store.subfamilias.push({ cod: data.cod, nombre: data.nombre, fam: data.fam, activo: true });
    }
  } else {
    const b = store.bodegas.find((x) => x.cod === editing);
    if (!b) return fail("La bodega no existe.");
    Object.assign(b, { nombre: data.nombre, dir: data.dir ?? "", resp: data.resp ?? "" });
  }
  return { ok: true };
}

export function alternarMaestro(kind: MaestroKind, cod: string): Res<{ activo: boolean }> {
  const list: { cod: string; activo: boolean }[] = kind === "familias" ? store.familias : kind === "subfamilias" ? store.subfamilias : store.bodegas;
  const x = list.find((i) => i.cod === cod);
  if (!x) return fail("El registro no existe.");
  x.activo = !x.activo;
  return { ok: true, activo: x.activo };
}

// ═════════════════════════ Configuración ═════════════════════════

export function patchConfig(fn: (c: Config) => string | void): Res {
  const err = fn(store.config);
  return err ? fail(err) : { ok: true };
}
