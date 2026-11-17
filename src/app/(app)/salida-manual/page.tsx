import type { Metadata } from "next";
import { PageHead } from "@/components/ui";
import { BODEGAS, type BodCod } from "@/lib/domain";
import { can } from "@/lib/rbac";
import { requireSession } from "@/server/auth";
import { getConfig, listBodegas, listCotizaciones, listProductos } from "@/server/inventory";
import { SalidaForm } from "./SalidaForm";

export const metadata: Metadata = { title: "Salida manual" };

export default async function SalidaManualPage() {
  const user = await requireSession();
  const products = listProductos().filter((p) => p.inv && p.activo).map((p) => ({
    cod: p.cod, desc: p.desc, stock: Object.fromEntries(BODEGAS.map((b) => [b, p.stock[b].disp])) as Record<BodCod, number>,
  }));
  return (
    <div className="flex flex-col gap-6">
      <PageHead kicker="Operación · Salidas sin cotización" title="Salida manual" />
      <SalidaForm
        products={products}
        bodegas={listBodegas().map((b) => ({ v: b.cod, l: b.nombre }))}
        clientes={[...new Set(listCotizaciones().map((c) => c.cli))].sort()}
        motivos={getConfig().motivosSalida}
        canAct={can(user.rol, "operar")}
      />
    </div>
  );
}
