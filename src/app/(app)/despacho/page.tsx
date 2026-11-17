import type { Metadata } from "next";
import Link from "next/link";
import { PageHead, Progress, StatusBadge } from "@/components/ui";
import { cotInfo } from "@/lib/domain";
import { fmtDate } from "@/lib/format";
import { requireSession } from "@/server/auth";
import { listCotizaciones, productMap } from "@/server/inventory";
import { BuscarCot } from "./BuscarCot";

export const metadata: Metadata = { title: "Despacho" };

export default async function DespachoPage() {
  await requireSession();
  const pm = productMap();
  const recent = listCotizaciones().filter((c) => c.estado === "Pendiente" || c.estado === "Parcial").slice(0, 5);

  return (
    <div className="flex flex-col gap-8">
      <PageHead
        kicker="Operación · Salidas por cotización"
        title="Despacho"
        actions={<Link href="/cotizaciones" className="btn btn-outline no-underline">Ver todas las aprobadas</Link>}
      />

      <section className="grid-bg flex flex-col items-center border border-n300 bg-white px-4 py-14 sm:px-8 sm:py-[72px]" aria-label="Buscar cotización">
        <BuscarCot />
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="recientes">
        <h2 id="recientes" className="!text-[11px] !font-semibold uppercase !tracking-[0.16em] text-n700">Últimas cotizaciones aprobadas</h2>
        <ul className="m-0 grid list-none grid-cols-1 border border-n300 bg-white p-0 sm:grid-cols-2 lg:grid-cols-5">
          {recent.map((c) => {
            const i = cotInfo(c, pm);
            return (
              <li key={c.id} className="border-b border-r border-n300 last:border-r-0">
                <Link href={`/despachar/${c.id}`} className="flex h-full flex-col gap-2.5 bg-white p-[18px] !text-ink no-underline transition-colors duration-150 hover:bg-n100">
                  <div className="flex items-center justify-between"><span className="text-xl font-extrabold tracking-[-0.02em]">{c.id}</span><StatusBadge estado={c.estado} /></div>
                  <div className="min-h-9 text-[13px] font-semibold">{c.cli}</div>
                  <Progress pct={i.pct} h={4} />
                  <div className="flex justify-between text-[11px] text-muted"><span>Aprob. {fmtDate(c.aprob)}</span><span className="tabular-nums">{i.pct}%</span></div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
