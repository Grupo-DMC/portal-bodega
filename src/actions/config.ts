"use server";

import { frecuenciaSchema, mailIdxSchema, mailSchema, motivoSchema, parametrosSchema, plantillaSchema } from "@/lib/schemas";
import { patchConfig } from "@/server/inventory";
import { authorize } from "@/server/auth";
import { run } from "./run";

export async function agregarMailAction(input: unknown) {
  return run("config", mailSchema, input, (d) =>
    patchConfig((c) => {
      if (c.destinatarios.some((x) => x.mail === d.mail)) return "Ese correo ya está en la lista.";
      if (c.destinatarios.length >= 50) return "Máximo 50 destinatarios.";
      c.destinatarios.push({ mail: d.mail, activo: true });
    }),
  );
}

export async function alternarMailAction(input: unknown) {
  return run("config", mailIdxSchema, input, (d) =>
    patchConfig((c) => {
      const x = c.destinatarios.find((i) => i.mail === d.mail);
      if (!x) return "El destinatario no existe.";
      x.activo = !x.activo;
    }),
  );
}

export async function quitarMailAction(input: unknown) {
  return run("config", mailIdxSchema, input, (d) =>
    patchConfig((c) => {
      c.destinatarios = c.destinatarios.filter((i) => i.mail !== d.mail);
    }),
  );
}

export async function guardarFrecuenciaAction(input: unknown) {
  return run("config", frecuenciaSchema, input, (d) =>
    patchConfig((c) => {
      c.frecuencia = d.frecuencia;
      c.hora = d.hora;
      c.amarillo = d.amarillo;
    }),
  );
}

export async function guardarPlantillaAction(input: unknown) {
  return run("config", plantillaSchema, input, (d) =>
    patchConfig((c) => {
      c.asunto = d.asunto;
      c.cuerpo = d.cuerpo;
    }),
  );
}

export async function guardarParametrosAction(input: unknown) {
  return run("config", parametrosSchema, input, (d) =>
    patchConfig((c) => {
      c.margen = d.margen;
      c.diasReserva = d.dias;
    }),
  );
}

export async function agregarMotivoAction(input: unknown) {
  return run("config", motivoSchema, input, (d) =>
    patchConfig((c) => {
      const arr = d.lista === "salida" ? c.motivosSalida : c.motivosAjuste;
      if (arr.includes(d.valor)) return "Ese motivo ya existe.";
      if (arr.length >= 30) return "Máximo 30 motivos.";
      arr.push(d.valor);
    }),
  );
}

export async function quitarMotivoAction(input: unknown) {
  return run("config", motivoSchema, input, (d) =>
    patchConfig((c) => {
      const arr = d.lista === "salida" ? c.motivosSalida : c.motivosAjuste;
      if (d.lista === "salida" && d.valor === "Otro") return "El motivo “Otro” es obligatorio y no se puede quitar.";
      const i = arr.indexOf(d.valor);
      if (i >= 0) arr.splice(i, 1);
    }),
  );
}

/** Simulado: no hay servidor de correo conectado todavía. No envía nada. */
export async function enviarPruebaAction(): Promise<{ ok: boolean; message: string }> {
  const a = await authorize("config");
  if ("error" in a) return { ok: false, message: a.error };
  return { ok: true, message: `Simulación: se enviaría un correo de prueba a ${a.user.email} con datos de ejemplo (el envío real se activará al conectar el servidor de correo).` };
}
