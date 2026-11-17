"use server";

import { codSchema, maestroSchema, maestroToggleSchema, productoSchema } from "@/lib/schemas";
import * as inv from "@/server/inventory";
import { run } from "./run";

export async function guardarProductoAction(input: unknown) {
  return run("maestros", productoSchema, input, (d, u) => {
    const { editing, ...data } = d;
    const hasMed = data.med && (data.med.l || data.med.a || data.med.h);
    return inv.guardarProducto({ ...data, med: hasMed ? data.med : null }, editing, u.nombre);
  });
}

export async function alternarProductoAction(input: unknown) {
  return run("maestros", codSchema, input, (d) => inv.alternarProducto(d.cod));
}

export async function guardarMaestroAction(input: unknown) {
  return run("maestros", maestroSchema, input, (d) => inv.guardarMaestro(d.kind, d.editing, d));
}

export async function alternarMaestroAction(input: unknown) {
  return run("maestros", maestroToggleSchema, input, (d) => inv.alternarMaestro(d.kind, d.cod));
}
