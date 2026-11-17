import type { Metadata } from "next";
import Link from "next/link";
import { FilterBar } from "@/components/FilterBar";
import { Badge, PageHead, StatusBadge } from "@/components/ui";
import { fmt } from "@/lib/format";
import { oneOf, pick, type SP } from "@/lib/params";
import { requirePermission } from "@/server/auth";
import { getFoto, listFamilias, listProductos, nombreFamilia, nombreSubfamilia, totalesDe } from "@/server/inventory";
import { ProductoActions } from "./ProductoActions";

export const metadata: Metadata = { title: "Productos" };

export default async function ProductosPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requirePermission("maestros");
  const sp = await searchParams;
  const q = pick(sp, "q").toLowerCase();
  const fam = oneOf(pick(sp, "fam", 10), listFamilias().map((f) => f.cod));
  const inv = oneOf(pick(sp, "inv", 2), ["si", "no"] as const);
  const est = oneOf(pick(sp, "est", 1), ["a", "i"] as const);
  const rows = listProductos().filter((p) => (!q || `${p.cod} ${p.desc}`.toLowerCase().includes(q)) && (!fam || p.fam === fam) && (!inv || (inv === "si") === p.inv) && (!est || (est === "a") === p.activo));

  return (
    <div className="flex flex-col gap-6">
      <PageHead kicker="Maestros · Incluye no inventariables" title="Productos" actions={<Link href="/productos/nuevo" className="btn btn-primary no-underline">+ Agregar producto</Link>} />
      <FilterBar
        className="sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]"
        fields={[
          { name: "q", label: "Buscar", type: "text", placeholder: "Código o descripción" },
          { name: "fam", label: "Familia", type: "select", allLabel: "Todas", options: listFamilias().map((f) => ({ v: f.cod, l: f.nombre })) },
          { name: "inv", label: "Inventariable", type: "select", options: [{ v: "si", l: "Sí" }, { v: "no", l: "No" }] },
          { name: "est", label: "Estado", type: "select", options: [{ v: "a", l: "Activo" }, { v: "i", l: "Inactivo" }] },
        ]}
      />
      <section className="panel" aria-label="Productos">
        <div className="table-wrap">
          <table className="tbl min-w-[1000px]">
            <thead><tr><th className="w-16">Foto</th><th>Código</th><th>Descripción</th><th>Familia</th><th>Subfamilia</th><th>Formato</th><th>Inventariable</th><th>Estado</th><th className="r">Acciones</th></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.cod} className={p.activo ? "" : "opacity-60"}>
                  <td>
                    {getFoto(p.cod) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/productos/${encodeURIComponent(p.cod)}/foto`} alt={`Foto de ${p.cod}`} width={44} height={44} className="grayscale-img h-11 w-11 bg-n100 object-contain outline outline-1 -outline-offset-1 outline-black/10" />
                    ) : (
                      <div className="grid h-11 w-11 place-items-center border border-n300 bg-n200 text-[10px] font-extrabold tracking-[-0.02em] text-muted" aria-hidden>{p.cod.slice(0, 4)}</div>
                    )}
                  </td>
                  <td className="font-extrabold">{p.cod}</td>
                  <td>{p.desc}</td>
                  <td>{nombreFamilia(p.fam)}</td>
                  <td className="text-n700">{p.sub ? nombreSubfamilia(p.sub) : "—"}</td>
                  <td className="text-n700">{p.formato || "—"}</td>
                  <td>{p.inv ? <Badge label="Sí" tone="outline" className="!text-ink" /> : <StatusBadge estado="No inventariable" />}</td>
                  <td><StatusBadge estado={p.activo ? "Activo" : "Inactivo"} /></td>
                  <td className="whitespace-nowrap text-right"><ProductoActions cod={p.cod} activo={p.activo} stock={totalesDe(p).disp} stockTxt={fmt(totalesDe(p).disp)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
