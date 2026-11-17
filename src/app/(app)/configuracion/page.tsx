import type { Metadata } from "next";
import { PageHead, TabLinks } from "@/components/ui";
import { oneOf, pick, type SP } from "@/lib/params";
import { requirePermission } from "@/server/auth";
import { getConfig, listProductos, totalesDe } from "@/server/inventory";
import { AlertasTab, ParametrosTab, PlantillaTab } from "./tabs";

export const metadata: Metadata = { title: "Configuración" };

export default async function ConfiguracionPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requirePermission("config");
  const tab = oneOf(pick(await searchParams, "tab", 3), ["al", "tpl", "par"] as const) || "al";
  const c = getConfig();
  const activos = c.destinatarios.filter((d) => d.activo).map((d) => d.mail);
  const rojos = listProductos().filter((p) => p.inv && p.activo).map((p) => ({ p, t: totalesDe(p) })).filter((x) => x.t.sem === "rojo")
    .map(({ p, t }) => ({ cod: p.cod, desc: p.desc, disp: t.disp, crit: p.crit }));

  return (
    <div className="flex flex-col gap-6">
      <PageHead kicker="Sistema" title="Configuración">
        <TabLinks base="/configuracion" current={tab} tabs={[{ key: "al", label: "Alertas de stock" }, { key: "tpl", label: "Plantilla de correo" }, { key: "par", label: "Parámetros" }]} />
      </PageHead>
      {tab === "al" && <AlertasTab destinatarios={c.destinatarios} frecuencia={c.frecuencia} hora={c.hora} amarillo={c.amarillo} margen={c.margen} />}
      {tab === "tpl" && <PlantillaTab asunto={c.asunto} cuerpo={c.cuerpo} para={activos} rojos={rojos} email={user.email} />}
      {tab === "par" && <ParametrosTab margen={c.margen} dias={c.diasReserva} salida={c.motivosSalida} ajuste={c.motivosAjuste} />}
    </div>
  );
}
