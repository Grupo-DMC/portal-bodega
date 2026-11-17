import type { Metadata } from "next";
import { PageHead, TabLinks } from "@/components/ui";
import { oneOf, pick, type SP } from "@/lib/params";
import { can } from "@/lib/rbac";
import { fmtDate, todayISO } from "@/lib/format";
import { requireSession } from "@/server/auth";
import { listBodegas, listCotizaciones, listProductos } from "@/server/inventory";
import { DevolucionForm, PackingForm } from "./forms";

export const metadata: Metadata = { title: "Entradas" };

export default async function EntradasPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireSession();
  const sp = await searchParams;
  const tab = oneOf(pick(sp, "tab", 3), ["pl", "dev"] as const) || "pl";
  const products = listProductos().map((p) => ({ cod: p.cod, desc: p.desc, inv: p.inv, activo: p.activo }));
  const bodegas = listBodegas().map((b) => ({ v: b.cod, l: b.nombre }));
  const clientes = [...new Set(listCotizaciones().map((c) => c.cli))].sort();
  const canAct = can(user.rol, "operar");

  return (
    <div className="flex flex-col gap-6">
      <PageHead kicker="Operación · Ingresos a bodega" title="Entradas">
        <TabLinks base="/entradas" current={tab} tabs={[{ key: "pl", label: "Ingreso por packing list" }, { key: "dev", label: "Devolución de cliente" }]} />
      </PageHead>
      {tab === "pl" ? (
        <PackingForm products={products} bodegas={bodegas} canAct={canAct} today={fmtDate(todayISO())} />
      ) : (
        <DevolucionForm products={products} clientes={clientes} canAct={canAct} />
      )}
    </div>
  );
}
