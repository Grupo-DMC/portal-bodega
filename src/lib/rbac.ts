import type { Rol } from "./domain";

/**
 * Permisos por rol. Se aplican en el SERVIDOR (páginas, acciones y rutas de API);
 * en la interfaz solo se usan para ocultar/inhabilitar controles.
 *  - operar:    despachar, ingresar, devoluciones, revisión, salida manual, conteos (sin aprobar)
 *  - aprobar:   aprobar y aplicar ajustes de conteo, cerrar cotizaciones con saldo
 *  - maestros:  productos, familias, subfamilias y bodegas
 *  - config:    alertas, plantilla de correo y parámetros
 */
export type Permiso = "operar" | "aprobar" | "maestros" | "config";

const PERMISOS: Record<Rol, readonly Permiso[]> = {
  Admin: ["operar", "aprobar", "maestros", "config"],
  Bodeguero: ["operar"],
  Ventas: [],
};

export function can(rol: Rol, permiso: Permiso): boolean {
  return PERMISOS[rol].includes(permiso);
}

export const ROL_LABEL: Record<Rol, string> = { Admin: "Administrador", Bodeguero: "Bodeguero", Ventas: "Ventas" };
