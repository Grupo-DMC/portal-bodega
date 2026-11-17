"use client";

import { useRouter } from "next/navigation";
import { DespachoDialog } from "@/components/DespachoDialog";
import type { DespachoData } from "@/server/despachoData";

/** Abre el despacho como modal (navegación suave) o como página completa (recarga / enlace directo). */
export function DespachoHost({ data, canAct, mode }: { data: DespachoData; canAct: boolean; mode: "modal" | "page" }) {
  const router = useRouter();
  const close = () => {
    if (mode === "modal" || window.history.length > 1) router.back();
    else router.push("/cotizaciones");
  };
  return <DespachoDialog data={data} canAct={canAct} onClose={close} />;
}
