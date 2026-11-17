import { NextResponse, type NextRequest } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { fmt, fmtDate } from "@/lib/format";
import { authorize } from "@/server/auth";
import { getCotizacion, getDespacho, getProducto, nombreBodega } from "@/server/inventory";

/** Texto seguro para las fuentes estándar de PDF (WinAnsi): reemplaza lo que no puede dibujar. */
const safe = (s: string) => s.replace(/[^\x20-\x7E¡-ÿ]/g, "?");

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const a = await authorize();
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: 401 });
  const { id } = await ctx.params;
  const d = /^DSP-\d{4,6}$/.test(id) ? getDespacho(id) : undefined;
  if (!d) return NextResponse.json({ error: "Despacho no encontrado" }, { status: 404 });
  const cot = getCotizacion(d.cot);

  const pdf = await PDFDocument.create();
  pdf.setTitle(`Comprobante de despacho ${d.id}`);
  pdf.setAuthor("DMC Bodega");
  pdf.setCreator("DMC Bodega");
  const page = pdf.addPage([595.28, 841.89]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const ink = rgb(0.125, 0.118, 0.114);
  const accent = rgb(0.925, 0.188, 0.075);
  const grey = rgb(0.41, 0.39, 0.39);
  const W = 595.28;
  const M = 48;

  const text = (p: PDFPage, s: string, x: number, y: number, size: number, f: PDFFont = reg, color = ink, align: "l" | "r" = "l") => {
    const t = safe(s);
    p.drawText(t, { x: align === "r" ? x - f.widthOfTextAtSize(t, size) : x, y, size, font: f, color });
  };

  page.drawRectangle({ x: 0, y: 841.89 - 6, width: W, height: 6, color: accent });
  text(page, "dMC", M, 780, 30, bold, rgb(0.42, 0.15, 0.55));
  text(page, "Comercializadora DMC S.P.A.", M + 78, 790, 10, bold);
  text(page, "Madrid 1269, Santiago", M + 78, 777, 9, reg, grey);
  text(page, "COMPROBANTE DE DESPACHO", W - M, 790, 11, bold, ink, "r");
  text(page, d.id, W - M, 770, 18, bold, accent, "r");
  page.drawLine({ start: { x: M, y: 755 }, end: { x: W - M, y: 755 }, thickness: 2, color: ink });

  const info: [string, string][] = [
    ["Cotización", d.cot], ["Cliente", cot ? `${cot.cli} · RUT ${cot.rut}` : "—"], ["Fecha y hora", `${fmtDate(d.fecha)} · ${d.hora}`], ["Despachado por", d.user],
    ["N° guía", d.guia || "—"], ["N° OC", d.oc || "—"], ["N° HEP", d.hep || "—"], ["Observación", d.obs || "—"],
  ];
  let y = 730;
  info.forEach(([k, v], i) => {
    const col = i % 2;
    const x = M + col * 250;
    text(page, k.toUpperCase(), x, y, 7.5, bold, grey);
    text(page, v.length > 44 ? `${v.slice(0, 43)}…` : v, x, y - 12, 10, bold);
    if (col === 1) y -= 34;
  });

  y -= 14;
  page.drawRectangle({ x: M, y: y - 6, width: W - 2 * M, height: 22, color: rgb(0.92, 0.91, 0.91) });
  text(page, "CÓDIGO", M + 8, y + 1, 8, bold);
  text(page, "DESCRIPCIÓN", M + 100, y + 1, 8, bold);
  text(page, "BODEGA ORIGEN", W - M - 120, y + 1, 8, bold);
  text(page, "CANTIDAD", W - M - 8, y + 1, 8, bold, ink, "r");
  y -= 24;
  let total = 0;
  for (const l of d.lines) {
    const p = getProducto(l.cod);
    text(page, l.cod, M + 8, y, 10, bold);
    text(page, (p?.desc ?? "").slice(0, 42), M + 100, y, 10);
    text(page, nombreBodega(l.bod), W - M - 120, y, 10);
    text(page, `${fmt(l.cant)} ${p?.um ?? ""}`, W - M - 8, y, 10, bold, ink, "r");
    page.drawLine({ start: { x: M, y: y - 8 }, end: { x: W - M, y: y - 8 }, thickness: 0.5, color: rgb(0.84, 0.83, 0.83) });
    total += l.cant;
    y -= 24;
  }
  text(page, `Total de unidades despachadas: ${fmt(total)}`, W - M - 8, y - 4, 10, bold, ink, "r");

  // Firmas
  const sy = 140;
  page.drawLine({ start: { x: M, y: sy }, end: { x: M + 200, y: sy }, thickness: 0.8, color: ink });
  page.drawLine({ start: { x: W - M - 200, y: sy }, end: { x: W - M, y: sy }, thickness: 0.8, color: ink });
  text(page, "Entregado por (bodega)", M, sy - 14, 8.5, reg, grey);
  text(page, "Recibido conforme (nombre, RUT y firma)", W - M - 200, sy - 14, 8.5, reg, grey);
  text(page, "Documento generado por DMC Bodega. Válido como respaldo interno del despacho; no reemplaza a la guía de despacho electrónica.", M, 60, 7.5, reg, grey);

  const bytes = await pdf.save();
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="comprobante_${d.id}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
