import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHead } from "@/components/ui";
import { requirePermission } from "@/server/auth";
import { getFoto, getProducto, listBodegas, listFamilias, listSubfamilias } from "@/server/inventory";
import { ProductoForm } from "../../ProductoForm";

export const metadata: Metadata = { title: "Editar producto" };

export default async function EditarProducto({ params }: { params: Promise<{ cod: string }> }) {
  await requirePermission("maestros");
  const cod = decodeURIComponent((await params).cod);
  const p = getProducto(cod);
  if (!p) notFound();
  return (
    <div className="flex flex-col gap-6">
      <PageHead kicker="Maestros · Productos" title={`Editar ${p.cod}`} actions={<Link href="/productos" className="btn btn-outline no-underline"><ArrowLeft size={14} aria-hidden /> Volver al maestro</Link>} />
      <ProductoForm
        key={p.cod}
        initial={{ cod: p.cod, desc: p.desc, fam: p.fam, sub: p.sub, um: p.um, formato: p.formato, inv: p.inv, activo: p.activo, crit: p.crit, med: p.med, tieneFoto: !!getFoto(p.cod) }}
        familias={listFamilias().filter((f) => f.activo || f.cod === p.fam).map((f) => ({ v: f.cod, l: f.nombre }))}
        subfamilias={listSubfamilias().filter((s) => s.activo || s.cod === p.sub).map((s) => ({ v: s.cod, l: s.nombre, fam: s.fam }))}
        bodegas={listBodegas().map((b) => ({ v: b.cod, l: b.nombre }))}
      />
    </div>
  );
}
