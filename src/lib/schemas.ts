import { z } from "zod";
import { BODEGAS } from "./domain";
import { parseDMY } from "./format";

/**
 * Esquemas de validación (Zod 4). Se usan en el servidor para TODA entrada de usuario
 * (acciones, rutas de API y parámetros de URL); el cliente solo los reutiliza para mensajes rápidos.
 */

const text = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres.`);
const required = (max: number, msg = "Campo obligatorio.") => z.string().trim().min(1, msg).max(max, `Máximo ${max} caracteres.`);

export const codigo = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9][A-Z0-9._-]{0,29}$/, "Código inválido: use letras, números, punto, guion (máx. 30).");

const doc = z
  .string()
  .trim()
  .max(30, "Máximo 30 caracteres.")
  .regex(/^[A-Za-z0-9 ._\-/]*$/, "Solo letras, números, espacio, punto, guion y barra.");

const bod = z.enum(BODEGAS, "Bodega inválida.");
const qty = z.number("Cantidad inválida.").int("Cantidad inválida.").positive("Cantidad inválida.").max(100_000_000, "Cantidad demasiado alta.");
const qty0 = z.number("Cantidad inválida.").int("Cantidad inválida.").min(0, "Cantidad inválida.").max(100_000_000, "Cantidad demasiado alta.");

export const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, "Ingrese su usuario.").max(32).regex(/^[a-z0-9._-]+$/, "Usuario inválido."),
  password: z.string().min(1, "Ingrese su contraseña.").max(128),
});

export const cotNumero = z.string().trim().regex(/^\d{1,12}$/, "Ingrese solo el número de la cotización (ej: 20887).");

export const despachoSchema = z.object({
  cot: z.string().regex(/^COT\d{1,12}$/, "Cotización inválida."),
  lines: z.array(z.object({ cod: codigo, bod, qty })).max(100),
  guia: doc,
  oc: doc,
  hep: doc,
  obs: text(400),
});

export const cerrarSchema = z.object({
  id: z.string().regex(/^COT\d{1,12}$/),
  motivo: required(400, "Debe indicar el motivo del cierre."),
});

export const packingSchema = z.object({
  prov: required(120, "Ingrese el proveedor."),
  pl: required(40, "Ingrese el N° de packing list."),
  fac: required(40, "Ingrese el N° de factura / DI."),
  bod,
  lines: z.array(z.object({ cod: text(30), qty: z.number().finite() })).min(1, "No hay filas para ingresar.").max(2000, "Máximo 2.000 filas por ingreso."),
});

export const devolucionSchema = z.object({
  guia: required(30, "Ingrese la guía de despacho."),
  cli: required(120, "Seleccione el cliente."),
  cot: text(20),
  motivo: required(400, "Ingrese el motivo de la devolución."),
  lines: z.array(z.object({ cod: codigo, qty })).min(1, "Agregue al menos un producto.").max(100),
});

export const revisionSchema = z.object({
  id: z.string().regex(/^DEV-\d{3,6}$/),
  ok: qty0,
  dan: qty0,
  bod,
  obs: text(400),
});

export const salidaSchema = z.object({
  lines: z.array(z.object({ cod: codigo, bod, qty })).min(1, "Agregue al menos un producto.").max(100),
  guia: doc,
  oc: doc,
  hep: doc,
  cli: text(120),
  motivo: required(60, "Seleccione un motivo del catálogo."),
  det: text(400),
});

export const conteoCrearSchema = z.object({
  bod,
  fam: text(10),
  fecha: z.string().transform((s, ctx) => {
    const iso = parseDMY(s);
    if (!iso) ctx.addIssue({ code: "custom", message: "Fecha inválida. Use dd/mm/aaaa." });
    return iso ?? "";
  }),
});

export const conteoGuardarSchema = z.object({
  id: z.string().regex(/^CNT-\d{4,6}$/),
  counts: z.record(z.string().max(30), z.number().int().min(0).max(100_000_000).nullable()),
});
export const conteoIdSchema = z.object({ id: z.string().regex(/^CNT-\d{4,6}$/) });

export const productoSchema = z.object({
  editing: z.boolean(),
  cod: codigo,
  desc: required(200, "Ingrese la descripción."),
  fam: required(10, "Seleccione la familia."),
  sub: text(10),
  um: z.enum(["UN", "MT", "KG", "LT", "CJ"]),
  formato: text(60),
  inv: z.boolean(),
  activo: z.boolean(),
  crit: z.number().int().min(0).max(100_000_000),
  med: z
    .object({
      tipo: z.enum(["Producto", "Embalaje"]),
      l: z.number().min(0).max(100_000).nullable(),
      a: z.number().min(0).max(100_000).nullable(),
      h: z.number().min(0).max(100_000).nullable(),
      u: z.enum(["cm", "mm", "m"]),
      peso: z.number().min(0).max(1_000_000).nullable(),
      pu: z.enum(["kg", "g"]),
    })
    .nullable(),
  stock: z.array(z.object({ bod, qty: qty0 })).max(3),
});

export const codSchema = z.object({ cod: codigo });

export const maestroSchema = z.object({
  kind: z.enum(["familias", "subfamilias", "bodegas"]),
  editing: z.string().max(10).nullable(),
  cod: codigo,
  nombre: required(80, "Campo obligatorio."),
  desc: text(200).optional(),
  fam: text(10).optional(),
  dir: text(200).optional(),
  resp: text(80).optional(),
});
export const maestroToggleSchema = z.object({ kind: z.enum(["familias", "subfamilias", "bodegas"]), cod: z.string().min(1).max(10) });

export const mailSchema = z.object({ mail: z.email("Ingrese un correo válido.").max(120).transform((s) => s.toLowerCase()) });
export const mailIdxSchema = z.object({ mail: z.string().max(120) });
export const frecuenciaSchema = z.object({
  frecuencia: z.enum(["inmediata", "diaria"]),
  hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida."),
  amarillo: z.boolean(),
});
export const plantillaSchema = z.object({ asunto: required(200, "Ingrese el asunto."), cuerpo: required(5000, "Ingrese el cuerpo.") });
export const parametrosSchema = z.object({
  margen: z.number("Margen inválido.").int().min(0).max(1000),
  dias: z.number("Días inválidos.").int().min(1).max(365),
});
export const motivoSchema = z.object({ lista: z.enum(["salida", "ajuste"]), valor: required(60, "Ingrese un motivo.") });

/** Primer mensaje de error legible de un resultado de validación. */
export function firstError(e: z.ZodError): string {
  const i = e.issues[0];
  if (!i) return "Revise los datos ingresados.";
  return /^Invalid|^Expected|^Too (small|big)|^Required/i.test(i.message) ? "Revise los datos ingresados." : i.message;
}
