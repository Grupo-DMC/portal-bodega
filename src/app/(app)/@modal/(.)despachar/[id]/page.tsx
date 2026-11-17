import { notFound } from "next/navigation";
import { DespachoHost } from "@/components/DespachoHost";
import { can } from "@/lib/rbac";
import { requireSession } from "@/server/auth";
import { loadDespacho } from "@/server/despachoData";

export default async function DespachoModal({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSession();
  const { id } = await params;
  const data = /^COT\d{1,12}$/.test(id) ? loadDespacho(id) : null;
  if (!data) notFound();
  return <DespachoHost data={data} canAct={can(user.rol, "operar")} mode="modal" />;
}
