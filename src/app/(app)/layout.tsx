import { AppShell, type SearchIndex } from "@/components/AppShell";
import { navFor } from "@/lib/nav";
import { can } from "@/lib/rbac";
import { fmt, fmtDate, todayISO } from "@/lib/format";
import { requireSession } from "@/server/auth";
import { listCotizaciones, listProductos, listRevision, totalesDe } from "@/server/inventory";

export default async function AppLayout({ children, modal }: { children: React.ReactNode; modal: React.ReactNode }) {
  const user = await requireSession();
  const cots = listCotizaciones();
  const prods = listProductos();

  const counts = {
    cotizaciones: cots.filter((c) => c.estado === "Pendiente").length,
    parciales: cots.filter((c) => c.estado === "Parcial").length,
    revision: listRevision().length,
    critico: prods.filter((p) => p.inv && p.activo && totalesDe(p).sem !== "verde").length,
  };
  const index: SearchIndex = {
    prods: prods.map((p) => ({ cod: p.cod, desc: p.desc, meta: p.inv ? `${fmt(totalesDe(p).disp)} ${p.um}` : "No inventariable" })),
    cots: cots.map((c) => ({ id: c.id, cli: c.cli, estado: c.estado })),
  };

  return (
    <AppShell
      user={{ nombre: user.nombre, rol: user.rol }}
      groups={navFor(user.rol)}
      counts={counts}
      index={index}
      today={fmtDate(todayISO())}
      readOnly={!can(user.rol, "operar")}
    >
      {children}
      {modal}
    </AppShell>
  );
}
