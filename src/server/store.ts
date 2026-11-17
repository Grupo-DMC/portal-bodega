import "server-only";
import { addDays, todayISO } from "@/lib/format";
import type {
  Bodega,
  BodCod,
  Config,
  Conteo,
  Cotizacion,
  Despacho,
  Familia,
  Medidas,
  Movimiento,
  Producto,
  Revision,
  StockCell,
  Subfamilia,
  Usuario,
} from "@/lib/domain";

/**
 * Datos FICTICIOS en memoria. Reemplazan a SQL Server mientras se desarrolla.
 * Las fechas del prototipo original (23/09/2026) se desplazan para que "hoy" sea hoy:
 * así los vencimientos y reservas siguen siendo coherentes cuando pasan los días.
 * Toda la lógica de negocio entra a estos datos solo a través de src/server/inventory.ts.
 */

const BASE = Date.UTC(2026, 8, 23);
function rel(dmy: string): string {
  if (!dmy) return "";
  const [d, m, y] = dmy.split("/").map(Number);
  return addDays(todayISO(), Math.round((Date.UTC(y, m - 1, d) - BASE) / 86_400_000));
}

export type Store = {
  usuarios: Usuario[];
  familias: Familia[];
  subfamilias: Subfamilia[];
  bodegas: Bodega[];
  productos: Producto[];
  cotizaciones: Cotizacion[];
  despachos: Despacho[];
  movimientos: Movimiento[]; // más reciente primero
  revision: Revision[];
  conteos: Conteo[];
  config: Config;
  alertasEnviadas: Record<string, string>;
  fotos: Map<string, { mime: string; data: Buffer }>;
  seq: { mov: number; desp: number; dev: number; cnt: number };
};

function build(): Store {
  const familias: Familia[] = [
    { cod: "ANT", nombre: "Antenas", desc: "Antenas antihurto EAS para accesos de tienda", activo: true },
    { cod: "ETQ", nombre: "Etiquetas", desc: "Etiquetas adhesivas y rígidos EAS", activo: true },
    { cod: "DES", nombre: "Desactivadores", desc: "Desactivadores y removedores de etiquetas", activo: true },
    { cod: "CNT", nombre: "Contadores", desc: "Contadores de personas para retail", activo: true },
    { cod: "MAT", nombre: "Materiales", desc: "Materiales e insumos de instalación", activo: true },
    { cod: "SRV", nombre: "Servicios", desc: "Servicios y cargos no inventariables", activo: true },
    { cod: "ACC", nombre: "Accesorios", desc: "Repuestos y accesorios discontinuados", activo: false },
  ];
  const subfamilias: Subfamilia[] = [
    { cod: "ANT-RF", nombre: "RF", fam: "ANT", activo: true },
    { cod: "ANT-AM", nombre: "AM", fam: "ANT", activo: true },
    { cod: "ETQ-AM", nombre: "Etiquetas AM", fam: "ETQ", activo: true },
    { cod: "ETQ-RF", nombre: "Etiquetas RF", fam: "ETQ", activo: true },
    { cod: "ETQ-RIG", nombre: "Rígidos", fam: "ETQ", activo: true },
    { cod: "DES-AM", nombre: "Desactivadores AM", fam: "DES", activo: true },
    { cod: "DES-REM", nombre: "Removedores", fam: "DES", activo: true },
    { cod: "CNT-IR", nombre: "Infrarrojo", fam: "CNT", activo: true },
    { cod: "CNT-3D", nombre: "Visión 3D", fam: "CNT", activo: true },
    { cod: "MAT-CAB", nombre: "Cableado", fam: "MAT", activo: true },
    { cod: "MAT-KIT", nombre: "Kits de instalación", fam: "MAT", activo: true },
    { cod: "SRV-INS", nombre: "Instalación", fam: "SRV", activo: true },
    { cod: "SRV-VIA", nombre: "Viáticos", fam: "SRV", activo: true },
    { cod: "ACC-REP", nombre: "Repuestos", fam: "ACC", activo: false },
  ];
  const bodegas: Bodega[] = [
    { cod: "BC", nombre: "Bodega Central", dir: "Madrid 1269, Santiago", resp: "Luis Pérez", activo: true },
    { cod: "BT", nombre: "Bodega Técnicos", dir: "Madrid 1269, piso 2, Santiago", resp: "Marcelo Rojas", activo: true },
    { cod: "BTR", nombre: "Bodega Tránsito", dir: "Av. Ramón Barros Luco 1613, San Antonio", resp: "Luis Pérez", activo: true },
  ];

  type Tri = [number, number, number];
  const S = (bc?: Tri, bt?: Tri, btr?: Tri): Record<BodCod, StockCell> => {
    const c = (t?: Tri): StockCell => ({ disp: t?.[0] ?? 0, rev: t?.[1] ?? 0, dan: t?.[2] ?? 0 });
    return { BC: c(bc), BT: c(bt), BTR: c(btr) };
  };
  const M = (tipo: Medidas["tipo"], l: number, a: number, h: number, u: Medidas["u"], peso: number, pu: Medidas["pu"]): Medidas => ({ tipo, l, a, h, u, peso, pu });
  const P = (
    cod: string, desc: string, fam: string, sub: string, um: string, formato: string, inv: boolean,
    crit: number, transito: number, stock: Record<BodCod, StockCell>, ult: string, med: Medidas | null = null, activo = true,
  ): Producto => ({ cod, desc, fam, sub, um, formato, inv, crit, transito, stock, ult: rel(ult), med, activo });

  const productos: Producto[] = [
    P("SD51", "SD-51 Master", "ANT", "ANT-RF", "UN", "", true, 6, 4, S([14, 1, 0], [2, 0, 0]), "12/09/2026", M("Embalaje", 175, 32, 12, "cm", 9.4, "kg")),
    P("SD52", "SD-52 Slave", "ANT", "ANT-RF", "UN", "", true, 8, 8, S([5, 0, 0], [1, 0, 1]), "12/09/2026", M("Embalaje", 175, 32, 12, "cm", 8.1, "kg")),
    P("SD60", "SD-60 Master AM", "ANT", "ANT-AM", "UN", "", true, 8, 0, S([11, 0, 0]), "28/07/2026", M("Producto", 160, 30, 8, "cm", 7.2, "kg")),
    P("PED-01", "Pedestal acrílico para antena", "ANT", "ANT-RF", "UN", "", true, 6, 0, S([18, 0, 0]), "02/08/2026"),
    P("FUE-24", "Fuente de poder 24 V para antena", "ANT", "", "UN", "", true, 6, 10, S([2, 0, 0]), "30/06/2026"),
    P("ETQ-AM58", "Etiqueta AM 58 kHz", "ETQ", "ETQ-AM", "UN", "Caja x 1000", true, 50000, 100000, S([184000, 2000, 0]), "21/09/2026", M("Embalaje", 40, 30, 25, "cm", 6.5, "kg")),
    P("ETQ-RF82", "Etiqueta RF 8,2 MHz 40x40", "ETQ", "ETQ-RF", "UN", "Caja x 1000", true, 40000, 60000, S([36000, 0, 0]), "04/09/2026"),
    P("ETQ-RIG", "Rígido Superlock", "ETQ", "ETQ-RIG", "UN", "Caja x 500", true, 1000, 0, S([3200, 0, 0]), "23/09/2026"),
    P("DES-01", "Desactivador AM", "DES", "DES-AM", "UN", "", true, 5, 0, S([6, 1, 0], [1, 0, 0]), "15/08/2026", M("Producto", 30, 20, 6, "cm", 2.1, "kg")),
    P("DES-REM", "Removedor magnético", "DES", "DES-REM", "UN", "", true, 10, 0, S([22, 0, 0]), "10/08/2026"),
    P("CP-01", "Contador de personas", "CNT", "CNT-IR", "UN", "", true, 6, 4, S([2, 1, 1], [1, 0, 0]), "11/07/2026", M("Producto", 18, 8, 5, "cm", 380, "g")),
    P("CP-3D", "Contador 3D estéreo", "CNT", "CNT-3D", "UN", "", true, 4, 0, S([8, 0, 0]), "17/09/2026"),
    P("MAT-01", "Materiales de instalación", "MAT", "MAT-KIT", "UN", "Kit", true, 20, 0, S([40, 0, 0], [12, 0, 0]), "01/09/2026"),
    P("CAB-UTP", "Cable UTP Cat6", "MAT", "MAT-CAB", "MT", "Rollo x 305 m", true, 500, 0, S([1850, 0, 0], [305, 0, 0]), "20/08/2026"),
    P("ETQ-RF30", "Etiqueta RF 8,2 MHz 30x30 (discontinuada)", "ETQ", "ETQ-RF", "UN", "Caja x 1000", true, 0, 0, S(), "12/01/2026", null, false),
    P("INS-01", "Instalación", "SRV", "SRV-INS", "UN", "", false, 0, 0, S(), ""),
    P("VIA", "Viáticos", "SRV", "SRV-VIA", "UN", "", false, 0, 0, S(), ""),
  ];

  const I = (cod: string, cant: number, desp = 0) => ({ cod, cant, desp });
  const C = (id: string, cli: string, rut: string, eje: string, aprob: string, vence: string, estado: Cotizacion["estado"], obs: string, items: Cotizacion["items"]): Cotizacion =>
    ({ id, cli, rut, eje, aprob: rel(aprob), vence: rel(vence), estado, obs, items });
  const cotizaciones: Cotizacion[] = [
    C("COT20918", "Sodimac S.A.", "96.792.430-K", "Rodrigo Salinas", "23/09/2026", "08/10/2026", "Pendiente", "Apertura tienda Sodimac Temuco", [I("SD51", 6), I("SD52", 6), I("MAT-01", 12), I("CAB-UTP", 300), I("INS-01", 6)]),
    C("COT20887", "CASAIDEAS", "76.322.590-9", "Gustavo Coloma", "23/09/2026", "05/10/2026", "Pendiente", "Antenas Osorno Casa Ideas", [I("SD51", 2), I("SD52", 2), I("INS-01", 4), I("MAT-01", 4), I("VIA", 1)]),
    C("COT20912", "Hites", "81.675.600-6", "Carolina Muñoz", "22/09/2026", "07/10/2026", "Pendiente", "Reposición etiquetas temporada", [I("ETQ-RF82", 20000), I("ETQ-RIG", 1000)]),
    C("COT20905", "Tricot S.A.", "84.000.000-1", "Rodrigo Salinas", "19/09/2026", "04/10/2026", "Pendiente", "Contadores tiendas zona sur", [I("CP-3D", 3), I("CP-01", 2), I("INS-01", 3), I("VIA", 1)]),
    C("COT20901", "Falabella Retail S.A.", "77.261.280-K", "Carolina Muñoz", "18/09/2026", "13/10/2026", "Parcial", "Etiquetas AM + desactivadores", [I("ETQ-AM58", 50000, 20000), I("DES-01", 4), I("INS-01", 2, 0)]),
    C("COT20895", "Farmacias Ahumada", "96.809.530-5", "Gustavo Coloma", "16/09/2026", "01/10/2026", "Parcial", "Etiquetado cadena farmacias", [I("ETQ-AM58", 30000, 10000), I("DES-REM", 6, 6)]),
    C("COT20874", "Cencosud Retail S.A. (Paris)", "81.201.000-K", "Gustavo Coloma", "10/09/2026", "30/09/2026", "Parcial", "Paris Costanera, recambio de antenas", [I("SD51", 4, 2), I("SD52", 4, 2), I("CP-01", 2), I("MAT-01", 6, 3), I("INS-01", 6)]),
    C("COT20860", "Comercial ECCSA S.A. (Ripley)", "83.382.700-6", "Gustavo Coloma", "01/09/2026", "21/09/2026", "Vencida", "Antenas AM Ripley Parque Arauco", [I("SD60", 2), I("INS-01", 1)]),
    C("COT20851", "Corona S.A.", "96.591.040-9", "Carolina Muñoz", "28/08/2026", "17/09/2026", "Completa", "", [I("SD51", 2, 2), I("SD52", 2, 2), I("INS-01", 2, 2)]),
    C("COT20842", "Walmart Chile S.A.", "76.042.014-K", "Rodrigo Salinas", "20/08/2026", "09/09/2026", "Cerrada", "Cerrada con saldo: cliente redujo alcance", [I("ETQ-AM58", 40000, 25000), I("DES-01", 2, 2)]),
  ];

  type DL = { cod: string; cant: number; bod: BodCod };
  const D = (id: string, cot: string, fecha: string, hora: string, guia: string, oc: string, hep: string, user: string, lines: DL[]): Despacho =>
    ({ id, cot, fecha: rel(fecha), hora, guia, oc, hep, user, obs: "", lines });
  const despachos: Despacho[] = [
    D("DSP-0005", "COT20895", "23/09/2026", "11:42", "45931", "4500123877", "", "Luis Pérez", [{ cod: "ETQ-AM58", cant: 10000, bod: "BC" }]),
    D("DSP-0004", "COT20874", "22/09/2026", "16:20", "45925", "", "HEP-88120", "Luis Pérez", [{ cod: "SD51", cant: 2, bod: "BC" }, { cod: "SD52", cant: 2, bod: "BC" }, { cod: "MAT-01", cant: 3, bod: "BC" }]),
    D("DSP-0003", "COT20901", "19/09/2026", "10:44", "45908", "4501998210", "", "Luis Pérez", [{ cod: "ETQ-AM58", cant: 20000, bod: "BC" }]),
    D("DSP-0002", "COT20895", "18/09/2026", "09:12", "45899", "", "", "Marcelo Rojas", [{ cod: "DES-REM", cant: 6, bod: "BC" }]),
    D("DSP-0001", "COT20851", "05/09/2026", "15:15", "45840", "7712", "", "Luis Pérez", [{ cod: "SD51", cant: 2, bod: "BC" }, { cod: "SD52", cant: 2, bod: "BC" }]),
  ];

  let mid = 1000;
  const mv = (fecha: string, hora: string, tipo: Movimiento["tipo"], cod: string, cant: number, bod: BodCod, doc: string, cot: string, cli: string, motivo: string, user: string, saldo: number): Movimiento =>
    ({ id: mid--, fecha: rel(fecha), hora, tipo, cod, cant, bod, doc, cot, cli, motivo, user, saldo });
  const movimientos: Movimiento[] = [
    mv("23/09/2026", "11:42", "Despacho cot", "ETQ-AM58", -10000, "BC", "Guía 45931 · OC 4500123877", "COT20895", "Farmacias Ahumada", "", "Luis Pérez", 184000),
    mv("23/09/2026", "10:15", "Entrada packing", "ETQ-RIG", 2000, "BC", "PL-2026-118 · Fact. 99812", "", "", "", "Luis Pérez", 3200),
    mv("23/09/2026", "09:30", "Salida manual", "MAT-01", -2, "BT", "Guía 45930", "", "", "Préstamo a técnico", "Luis Pérez", 12),
    mv("23/09/2026", "09:05", "Ajuste conteo", "CAB-UTP", -45, "BC", "Conteo CNT-0031", "", "", "Conteo físico", "Andrea Vidal", 1850),
    mv("22/09/2026", "17:48", "Devolución", "ETQ-AM58", 2000, "BC", "Guía 45911", "", "Farmacias Ahumada", "Producto sin uso · queda en revisión", "Luis Pérez", 194000),
    mv("22/09/2026", "16:20", "Despacho cot", "SD51", -2, "BC", "Guía 45925 · HEP-88120", "COT20874", "Cencosud Retail S.A. (Paris)", "", "Luis Pérez", 14),
    mv("22/09/2026", "16:20", "Despacho cot", "SD52", -2, "BC", "Guía 45925 · HEP-88120", "COT20874", "Cencosud Retail S.A. (Paris)", "", "Luis Pérez", 5),
    mv("22/09/2026", "16:20", "Despacho cot", "MAT-01", -3, "BC", "Guía 45925 · HEP-88120", "COT20874", "Cencosud Retail S.A. (Paris)", "", "Luis Pérez", 40),
    mv("22/09/2026", "11:02", "Cambio de estado", "SD52", -1, "BT", "Revisión DEV-0138", "", "Corona S.A.", "Disponible → Dañado", "Andrea Vidal", 1),
    mv("21/09/2026", "15:33", "Entrada packing", "ETQ-AM58", 80000, "BC", "PL-2026-117 · DI 8834521", "", "", "", "Luis Pérez", 194000),
    mv("20/09/2026", "12:10", "Devolución", "CP-01", 1, "BC", "Guía 45880", "", "Cencosud Retail S.A. (Paris)", "Falla técnica · queda en revisión", "Luis Pérez", 2),
    mv("19/09/2026", "10:44", "Despacho cot", "ETQ-AM58", -20000, "BC", "Guía 45908 · OC 4501998210", "COT20901", "Falabella Retail S.A.", "", "Luis Pérez", 114000),
    mv("19/09/2026", "10:02", "Devolución", "DES-01", 1, "BC", "Guía 45902", "", "Falabella Retail S.A.", "Error de pedido · queda en revisión", "Marcelo Rojas", 6),
    mv("18/09/2026", "16:30", "Salida manual", "SD51", -1, "BT", "HEP-88031", "", "Tricot S.A.", "Garantía", "Marcelo Rojas", 2),
    mv("18/09/2026", "09:12", "Despacho cot", "DES-REM", -6, "BC", "Guía 45899", "COT20895", "Farmacias Ahumada", "", "Marcelo Rojas", 22),
    mv("17/09/2026", "14:25", "Entrada packing", "CP-3D", 6, "BC", "PL-2026-116 · Fact. 99640", "", "", "", "Luis Pérez", 8),
    mv("16/09/2026", "11:40", "Devolución", "SD51", 1, "BC", "Guía 45871", "", "Corona S.A.", "Antena golpeada · queda en revisión", "Luis Pérez", 14),
    mv("15/09/2026", "17:05", "Ajuste conteo", "DES-01", 1, "BC", "Conteo CNT-0030", "", "", "Conteo físico", "Andrea Vidal", 6),
    mv("12/09/2026", "10:20", "Entrada packing", "SD51", 12, "BC", "PL-2026-114 · DI 8831002", "", "", "", "Luis Pérez", 16),
    mv("12/09/2026", "10:20", "Entrada packing", "SD52", 8, "BC", "PL-2026-114 · DI 8831002", "", "", "", "Luis Pérez", 9),
    mv("10/09/2026", "09:50", "Salida manual", "CAB-UTP", -120, "BT", "OC 7781", "", "", "Uso interno", "Marcelo Rojas", 305),
    mv("05/09/2026", "15:15", "Despacho cot", "SD51", -2, "BC", "Guía 45840 · OC 7712", "COT20851", "Corona S.A.", "", "Luis Pérez", 4),
  ];

  const R = (id: string, cod: string, cant: number, cli: string, guia: string, fecha: string, motivo: string): Revision =>
    ({ id, cod, cant, cli, guia, fecha: rel(fecha), motivo, bod: "BC" });
  const revision: Revision[] = [
    R("DEV-0142", "SD51", 1, "Corona S.A.", "45871", "16/09/2026", "Antena golpeada en traslado"),
    R("DEV-0145", "DES-01", 1, "Falabella Retail S.A.", "45902", "19/09/2026", "Error de pedido"),
    R("DEV-0147", "CP-01", 1, "Cencosud Retail S.A. (Paris)", "45880", "20/09/2026", "Falla técnica, no cuenta"),
    R("DEV-0149", "ETQ-AM58", 2000, "Farmacias Ahumada", "45911", "22/09/2026", "Producto sin uso"),
  ];

  const conteos: Conteo[] = [
    { id: "CNT-0034", bod: "BTR", fam: "", fecha: rel("23/09/2026"), estado: "Por aprobar", user: "Luis Pérez", items: 3, dif: 0, counts: { SD51: 0, SD52: 0, "CP-01": 1 } },
    { id: "CNT-0033", bod: "BC", fam: "ANT", fecha: rel("23/09/2026"), estado: "En conteo", user: "Luis Pérez", items: 5, dif: null, counts: { SD51: 14, SD52: 5, SD60: 10 } },
    { id: "CNT-0032", bod: "BT", fam: "", fecha: rel("24/09/2026"), estado: "Borrador", user: "Andrea Vidal", items: 0, dif: null, counts: {} },
    { id: "CNT-0031", bod: "BC", fam: "MAT", fecha: rel("23/09/2026"), estado: "Aplicado", user: "Andrea Vidal", items: 2, dif: -45, counts: {} },
    { id: "CNT-0030", bod: "BC", fam: "DES", fecha: rel("15/09/2026"), estado: "Aplicado", user: "Andrea Vidal", items: 2, dif: 1, counts: {} },
    { id: "CNT-0029", bod: "BT", fam: "", fecha: rel("01/09/2026"), estado: "Aplicado", user: "Andrea Vidal", items: 6, dif: -3, counts: {} },
  ];

  const config: Config = {
    margen: 5,
    diasReserva: 15,
    frecuencia: "diaria",
    hora: "08:00",
    amarillo: true,
    destinatarios: [
      { mail: "bodega@dmc.cl", activo: true },
      { mail: "lperez@dmc.cl", activo: true },
      { mail: "avidal@dmc.cl", activo: true },
      { mail: "compras@dmc.cl", activo: false },
    ],
    asunto: "Alerta de stock crítico · {producto_codigo} {producto_descripcion}",
    cuerpo:
      "Estimado equipo:\n\nEl producto {producto_codigo} · {producto_descripcion} quedó con un saldo de {saldo_actual} unidades en {bodega}, bajo su stock crítico de {stock_critico}.\n\n{tabla_productos}\n\nFecha del aviso: {fecha}.\n\nDMC Bodega · Comercializadora DMC S.P.A.",
    motivosSalida: ["Préstamo a técnico", "Garantía", "Reposición", "Uso interno", "Otro"],
    motivosAjuste: ["Conteo físico", "Merma", "Error de digitación", "Otro"],
  };

  const usuarios: Usuario[] = [
    { username: "avidal", nombre: "Andrea Vidal", rol: "Admin", email: "avidal@dmc.cl" },
    { username: "lperez", nombre: "Luis Pérez", rol: "Bodeguero", email: "lperez@dmc.cl" },
    { username: "gcoloma", nombre: "Gustavo Coloma", rol: "Ventas", email: "gcoloma@dmc.cl" },
  ];

  return {
    usuarios, familias, subfamilias, bodegas, productos, cotizaciones, despachos, movimientos, revision, conteos, config,
    alertasEnviadas: {
      SD52: `${rel("22/09/2026")} 16:21`,
      "ETQ-RF82": `${rel("04/09/2026")} 08:00`,
      "CP-01": `${rel("20/09/2026")} 08:00`,
      "FUE-24": `${rel("01/07/2026")} 08:00`,
    },
    fotos: new Map(),
    seq: { mov: 1000, desp: 5, dev: 149, cnt: 34 },
  };
}

const g = globalThis as unknown as { __dmcStore?: Store };
/** Singleton: sobrevive al hot-reload de desarrollo. */
export const store: Store = (g.__dmcStore ??= build());
