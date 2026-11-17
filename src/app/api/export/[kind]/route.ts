import { NextResponse, type NextRequest } from "next/server";
import { toCsv } from "@/lib/csv";
import { todayISO } from "@/lib/format";
import { authorize } from "@/server/auth";
import { inventarioCsvRows, movimientosCsvRows, parseInvFilters, parseMovFilters, queryInventario, queryMovimientos } from "@/server/queries";

/** Exportación CSV generada en el servidor: exige sesión, valida los filtros y neutraliza fórmulas de Excel. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ kind: string }> }) {
  const a = await authorize();
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: 401 });

  const { kind } = await ctx.params;
  const sp = Object.fromEntries(req.nextUrl.searchParams);
  let csv: string;
  let name: string;
  if (kind === "inventario") {
    csv = toCsv(inventarioCsvRows(queryInventario(parseInvFilters(sp))));
    name = `inventario_dmc_${todayISO()}.csv`;
  } else if (kind === "movimientos") {
    csv = toCsv(movimientosCsvRows(queryMovimientos(parseMovFilters(sp))));
    name = `movimientos_dmc_${todayISO()}.csv`;
  } else {
    return NextResponse.json({ error: "Exportación no encontrada" }, { status: 404 });
  }
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
