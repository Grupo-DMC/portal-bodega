import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DespachoHost } from "@/components/DespachoHost";
import { PageHead } from "@/components/ui";
import { can } from "@/lib/rbac";
import { requireSession } from "@/server/auth";
import { loadDespacho } from "@/server/despachoData";

export const metadata: Metadata = { title: "Despacho" };

export default async function DespacharPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSession();
  const { id } = await params;
  const data = /^COT\d{1,12}$/.test(id) ? loadDespacho(id) : null;
  if (!data) notFound();
  return (
    <>
      <PageHead kicker="Operación · Salidas por cotización" title={`Despacho ${data.id}`} />
      <DespachoHost data={data} canAct={can(user.rol, "operar")} mode="page" />
    </>
  );
}
