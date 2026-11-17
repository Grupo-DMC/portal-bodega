import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHead } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { can } from "@/lib/rbac";
import { requireSession } from "@/server/auth";
import { getConteo, nombreBodega, nombreFamilia, productosDelConteo } from "@/server/inventory";
import { ConteoView } from "./ConteoView";

export const metadata: Metadata = { title: "Conteo" };

export default async function ConteoPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSession();
  const { id } = await params;
  const c = /^CNT-\d{4,6}$/.test(id) ? getConteo(id) : undefined;
  if (!c) notFound();

  const lines = productosDelConteo(c).map((p) => ({ cod: p.cod, desc: p.desc, sys: p.stock[c.bod].disp, val: c.counts[p.cod] ?? null }));
  return (
    <div className="flex flex-col gap-6">
      <PageHead
        kicker="Control · Conteo físico"
        title={c.id}
        actions={<Link href="/toma-inventario" className="btn btn-outline no-underline"><ArrowLeft size={14} aria-hidden /> Historial de conteos</Link>}
      />
      <ConteoView
        key={`${c.id}-${c.estado}`}
        info={{ id: c.id, estado: c.estado, bod: nombreBodega(c.bod), fam: c.fam ? nombreFamilia(c.fam) : "Todas", fecha: fmtDate(c.fecha), user: c.user }}
        lines={lines}
        canOperate={can(user.rol, "operar")}
        canApprove={can(user.rol, "aprobar")}
      />
    </div>
  );
}
