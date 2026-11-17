import type { Metadata } from "next";
import Link from "next/link";
import { PageHead, Panel, StatusBadge } from "@/components/ui";
import { fmtDate, fmtS, todayISO } from "@/lib/format";
import { can } from "@/lib/rbac";
import { requireSession } from "@/server/auth";
import { listBodegas, listConteos, listFamilias, nombreBodega, nombreFamilia } from "@/server/inventory";
import { CrearConteo } from "./CrearConteo";

export const metadata: Metadata = { title: "Toma de inventario" };

export default async function TomaInventarioPage() {
  const user = await requireSession();
  const operate = can(user.rol, "operar");
  const hoyDMY = fmtDate(todayISO());

  return (
    <div className="flex flex-col gap-6">
      <PageHead kicker="Control · Conteo físico" title="Toma de inventario" />
      {operate && (
        <CrearConteo
          bodegas={listBodegas().map((b) => ({ v: b.cod, l: b.nombre }))}
          familias={listFamilias().filter((f) => f.activo && f.cod !== "SRV").map((f) => ({ v: f.cod, l: f.nombre }))}
          hoy={hoyDMY}
        />
      )}
      <Panel title="Historial de conteos">
        <div className="table-wrap">
          <table className="tbl min-w-[840px]">
            <thead><tr><th>N° conteo</th><th>Bodega</th><th>Familia</th><th>Fecha</th><th>Responsable</th><th className="r">Productos</th><th className="r">Diferencia neta</th><th>Estado</th><th /></tr></thead>
            <tbody>
              {listConteos().map((c) => (
                <tr key={c.id}>
                  <td className="font-extrabold">{c.id}</td>
                  <td>{nombreBodega(c.bod)}</td>
                  <td>{c.fam ? nombreFamilia(c.fam) : "Todas"}</td>
                  <td>{fmtDate(c.fecha)}</td>
                  <td>{c.user}</td>
                  <td className="r">{c.items || "—"}</td>
                  <td className={`r font-bold ${c.dif !== null && c.dif < 0 ? "text-a700" : ""}`}>{c.dif === null ? "—" : fmtS(c.dif)}</td>
                  <td><StatusBadge estado={c.estado} /></td>
                  <td className="text-right"><Link href={`/toma-inventario/${c.id}`} className="btn btn-outline btn-sm no-underline">{c.estado === "Aplicado" || !operate ? "Ver" : "Continuar"}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
