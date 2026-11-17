import "server-only";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import type { Permiso } from "@/lib/rbac";
import type { Usuario } from "@/lib/domain";
import { firstError } from "@/lib/schemas";
import { authorize } from "@/server/auth";
import type { Res } from "@/server/inventory";

/**
 * Envoltorio común de TODAS las acciones: sesión → permiso → validación Zod → lógica → revalidar.
 * La entrada del cliente se trata siempre como `unknown` (nunca se confía en tipos ni roles que envíe).
 */
export async function run<S extends z.ZodType, R extends object>(
  permiso: Permiso | undefined,
  schema: S,
  input: unknown,
  fn: (data: z.output<S>, user: Usuario) => Res<R>,
): Promise<Res<R>> {
  const a = await authorize(permiso);
  if ("error" in a) return { ok: false, error: a.error };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  let out: Res<R>;
  try {
    out = fn(parsed.data, a.user);
  } catch (e) {
    console.error("[accion]", e); // detalle solo en el log del servidor
    return { ok: false, error: "No se pudo completar la operación. Intente nuevamente." };
  }
  if (out.ok) revalidatePath("/", "layout");
  return out;
}
