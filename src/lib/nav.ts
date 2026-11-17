import type { Rol } from "./domain";
import { can } from "./rbac";

export type NavItem = { href: string; label: string; key?: "cotizaciones" | "parciales" | "revision" | "critico" };
export type NavGroup = { label: string; items: NavItem[] };

export function navFor(rol: Rol): NavGroup[] {
  const g: NavGroup[] = [
    {
      label: "Operación",
      items: [
        { href: "/", label: "Dashboard" },
        { href: "/despacho", label: "Despacho" },
        { href: "/cotizaciones", label: "Cotizaciones aprobadas", key: "cotizaciones" },
        { href: "/parciales", label: "Despachos parciales", key: "parciales" },
        { href: "/entradas", label: "Entradas" },
        { href: "/revision", label: "Revisión de devoluciones", key: "revision" },
        { href: "/salida-manual", label: "Salida manual" },
      ],
    },
    {
      label: "Control",
      items: [
        { href: "/inventario", label: "Inventario" },
        { href: "/reservas", label: "Reservas" },
        { href: "/stock-critico", label: "Stock crítico", key: "critico" },
        { href: "/movimientos", label: "Movimientos" },
        { href: "/toma-inventario", label: "Toma de inventario" },
      ],
    },
  ];
  if (can(rol, "maestros")) {
    g.push({
      label: "Maestros",
      items: [
        { href: "/productos", label: "Productos" },
        { href: "/maestros/familias", label: "Familias" },
        { href: "/maestros/subfamilias", label: "Subfamilias" },
        { href: "/maestros/bodegas", label: "Bodegas" },
      ],
    });
  }
  if (can(rol, "config")) g.push({ label: "Sistema", items: [{ href: "/configuracion", label: "Configuración" }] });
  return g;
}

/** Migas de pan a partir de la ruta. */
export function crumbFor(pathname: string, groups: NavGroup[], rol: Rol): { group: string; page: string } {
  const admin = can(rol, "maestros");
  const seg = pathname.split("/").filter(Boolean);
  if (seg[0] === "productos" && seg.length > 1) {
    if (seg[1] === "nuevo") return { group: "Maestros", page: "Productos / Agregar" };
    const cod = decodeURIComponent(seg[1]);
    if (seg[2] === "editar") return { group: "Maestros", page: `Productos / Editar ${cod}` };
    return admin ? { group: "Maestros", page: `Productos / ${cod}` } : { group: "Control", page: `Ficha / ${cod}` };
  }
  if (seg[0] === "toma-inventario" && seg[1]) return { group: "Control", page: `Toma de inventario / ${decodeURIComponent(seg[1])}` };
  let best: { group: string; page: string; len: number } = { group: "", page: "", len: -1 };
  for (const g of groups) {
    for (const it of g.items) {
      const match = it.href === "/" ? pathname === "/" : pathname === it.href || pathname.startsWith(`${it.href}/`);
      if (match && it.href.length > best.len) best = { group: g.label, page: it.label, len: it.href.length };
    }
  }
  return { group: best.group, page: best.page };
}
