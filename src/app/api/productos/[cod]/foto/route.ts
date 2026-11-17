import { NextResponse, type NextRequest } from "next/server";
import { codigo } from "@/lib/schemas";
import { authorize } from "@/server/auth";
import { getFoto, quitarFoto, setFoto } from "@/server/inventory";

const MAX_BYTES = 2 * 1024 * 1024;

/** Detecta el tipo REAL por la firma del archivo (no confía en el nombre ni en el Content-Type enviado). */
function sniff(b: Buffer): "image/png" | "image/jpeg" | null {
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  return null;
}

/** Protección CSRF para rutas de API: el Origin debe ser el mismo host. */
function sameOrigin(req: NextRequest): boolean {
  const o = req.headers.get("origin");
  if (!o) return false;
  try {
    return new URL(o).host === req.headers.get("host");
  } catch {
    return false;
  }
}

async function cod(ctx: { params: Promise<{ cod: string }> }) {
  const p = codigo.safeParse(decodeURIComponent((await ctx.params).cod));
  return p.success ? p.data : null;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ cod: string }> }) {
  const a = await authorize();
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: 401 });
  const c = await cod(ctx);
  const f = c ? getFoto(c) : undefined;
  if (!f) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(f.data), {
    headers: {
      "Content-Type": f.mime,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "private, max-age=60",
    },
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ cod: string }> }) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
  const a = await authorize("maestros");
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.error.includes("permiso") ? 403 : 401 });
  const c = await cod(ctx);
  if (!c) return NextResponse.json({ error: "Código inválido" }, { status: 400 });

  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BYTES + 4096) return NextResponse.json({ error: "La imagen supera 2 MB." }, { status: 413 });
  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get("file");
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  if (!(file instanceof File)) return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "La imagen supera 2 MB." }, { status: 413 });
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = sniff(buf);
  if (!mime) return NextResponse.json({ error: "Solo se permiten imágenes JPG o PNG." }, { status: 415 });
  const r = setFoto(c, mime, buf);
  return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: 404 });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ cod: string }> }) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
  const a = await authorize("maestros");
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.error.includes("permiso") ? 403 : 401 });
  const c = await cod(ctx);
  if (!c) return NextResponse.json({ error: "Código inválido" }, { status: 400 });
  quitarFoto(c);
  return NextResponse.json({ ok: true });
}
