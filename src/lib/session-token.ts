import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Token de sesión firmado con HMAC-SHA256 (formato: base64url(payload).base64url(firma)).
 * Sin estado en servidor: el payload solo lleva usuario y expiración; el rol se vuelve
 * a leer de la base en cada petición, así un cambio de rol o una baja aplican de inmediato.
 * Se importa desde proxy.ts (runtime Node), por eso NO importa "server-only".
 */

export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-dmcb_session" : "dmcb_session";
export const SESSION_TTL_S = 60 * 60 * 8; // 8 horas

export type SessionPayload = { u: string; iat: number; exp: number };

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET es obligatorio en producción (mínimo 32 caracteres).");
  }
  // Solo desarrollo: secreto fijo derivado de la ruta del proyecto. Nunca llega a producción.
  return `dev-only-insecure-secret::${process.cwd()}::0123456789abcdef`;
}

const b64 = (b: Buffer | string) => Buffer.from(b).toString("base64url");
const sign = (data: string) => createHmac("sha256", secret()).update(data).digest();

export function signSession(username: string, now = Date.now()): string {
  const iat = Math.floor(now / 1000);
  const body = b64(JSON.stringify({ u: username, iat, exp: iat + SESSION_TTL_S } satisfies SessionPayload));
  return `${body}.${b64(sign(body))}`;
}

export function verifySession(token: string | undefined | null, now = Date.now()): SessionPayload | null {
  if (!token || token.length > 512) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  let given: Buffer;
  try {
    given = Buffer.from(sig, "base64url");
  } catch {
    return null;
  }
  const expected = sign(body);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (typeof p.u !== "string" || typeof p.exp !== "number") return null;
    if (p.exp * 1000 < now) return null;
    return p;
  } catch {
    return null;
  }
}
