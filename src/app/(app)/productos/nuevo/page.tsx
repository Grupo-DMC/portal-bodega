import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHead } from "@/components/ui";
import { requirePermission } from "@/server/auth";
import { listBodegas, listFamilias, listSubfamilias } from "@/server/inventory";
import { ProductoForm } from "../ProductoForm";

export const metadata: Metadata = { title: "Agregar producto" };

export default async function NuevoProducto() {
  await requirePermission("maestros");
  return (
    <div className="flex flex-col gap-6">
      <PageHead kicker="Maestros · Productos" title="Agregar Producto" actions={<Link href="/productos" className="btn btn-outline no-underline"><ArrowLeft size={14} aria-hidden /> Volver al maestro</Link>} />
      <ProductoForm
        initial={null}
        familias={listFamilias().filter((f) => f.activo).map((f) => ({ v: f.cod, l: f.nombre }))}
        subfamilias={listSubfamilias().filter((s) => s.activo).map((s) => ({ v: s.cod, l: s.nombre, fam: s.fam }))}
        bodegas={listBodegas().map((b) => ({ v: b.cod, l: b.nombre }))}
      />
    </div>
  );
}
