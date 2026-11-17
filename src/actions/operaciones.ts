"use server";

import { redirect } from "next/navigation";
import {
  cerrarSchema,
  conteoCrearSchema,
  conteoGuardarSchema,
  conteoIdSchema,
  cotNumero,
  despachoSchema,
  devolucionSchema,
  packingSchema,
  revisionSchema,
  salidaSchema,
} from "@/lib/schemas";
import { authorize } from "@/server/auth";
import { can } from "@/lib/rbac";
import * as inv from "@/server/inventory";
import { run } from "./run";

export type FormState = { error?: string };

/** /despacho: valida el N° y abre el despacho (el cuadro de diálogo se carga por ruta). */
export async function buscarCotizacionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const a = await authorize();
  if ("error" in a) return { error: a.error };
  const n = cotNumero.safeParse(String(formData.get("n") ?? "").replace(/\D/g, ""));
  if (!n.success) return { error: n.error.issues[0]?.message ?? "Ingrese un número de cotización." };
  const c = inv.getCotizacion(`COT${n.data}`);
  if (!c) return { error: `No se encontró una cotización aprobada con el N° COT${n.data}.` };
  redirect(`/despachar/${c.id}`);
}

export async function despacharAction(input: unknown) {
  return run("operar", despachoSchema, input, (d, u) => inv.despachar(d, u.nombre));
}

export async function cerrarCotizacionAction(input: unknown) {
  return run("aprobar", cerrarSchema, input, (d) => inv.cerrarCotizacion(d.id, d.motivo));
}

export async function ingresarPackingAction(input: unknown) {
  return run("operar", packingSchema, input, (d, u) => inv.ingresarPacking(d, u.nombre));
}

export async function registrarDevolucionAction(input: unknown) {
  return run("operar", devolucionSchema, input, (d, u) => inv.registrarDevolucion(d, u.nombre));
}

export async function aplicarRevisionAction(input: unknown) {
  return run("operar", revisionSchema, input, (d, u) => inv.aplicarRevision(d.id, d.ok, d.dan, d.bod, d.obs, u.nombre));
}

export async function salidaManualAction(input: unknown) {
  return run("operar", salidaSchema, input, (d, u) => inv.salidaManual(d, u.nombre));
}

export async function crearConteoAction(input: unknown) {
  return run("operar", conteoCrearSchema, input, (d, u) => inv.crearConteo(d.bod, d.fam, d.fecha, u.nombre));
}

export async function guardarConteoAction(input: unknown) {
  return run("operar", conteoGuardarSchema, input, (d) => inv.guardarConteos(d.id, d.counts));
}

export async function avanzarConteoAction(input: unknown) {
  // 'operar' para iniciar / enviar; la aprobación final exige 'aprobar' (se verifica dentro).
  return run("operar", conteoIdSchema, input, (d, u) => inv.avanzarConteo(d.id, u.nombre, can(u.rol, "aprobar")));
}
