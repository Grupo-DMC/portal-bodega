import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session-token";

/**
 * 1) Content-Security-Policy con nonce por petición (sin 'unsafe-inline' para scripts).
 * 2) Filtro de acceso: sin sesión válida solo se puede ver /login.
 *    Es una primera barrera: cada página, acción y ruta de API vuelve a verificar la sesión y el permiso.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isDev = process.env.NODE_ENV !== "production";
  const authed = !!verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if (!authed && pathname !== "/login") {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (authed && pathname === "/login" && req.method === "GET") return NextResponse.redirect(new URL("/", req.url));

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    isDev ? "style-src 'self' 'unsafe-inline'" : `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'", // anchos de barras/gráficos (atributo style)
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // Solo si la petición llegó por HTTPS (así no rompe pruebas locales en http://localhost).
    ...(req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https" ? ["upgrade-insecure-requests"] : []),
  ].join("; ");

  const headers = new Headers(req.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const res = NextResponse.next({ request: { headers } });
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("Cache-Control", "private, no-store"); // datos de inventario: nada en cachés compartidas
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
