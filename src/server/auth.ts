import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_TTL_S, signSession, verifySession } from "@/lib/session-token";
import { can, type Permiso } from "@/lib/rbac";
import type { Usuario } from "@/lib/domain";
import { store } from "./store";

// ───────────── Contraseñas (scrypt + sal por usuario) ─────────────

function hashPassword(pw: string, salt = randomBytes(16)): { salt: Buffer; hash: Buffer } {
  return { salt, hash: scryptSync(pw, salt, 64) };
}

type Cred = { salt: Buffer; hash: Buffer };
const g = globalThis as unknown as { __dmcCreds?: Map<string, Cred>; __dmcDummy?: Cred; __dmcLimiter?: Map<string, { n: number; first: number }> };

function demoPassword(): string {
  const p = process.env.DEMO_PASSWORD;
  if (p) return p;
  if (process.env.NODE_ENV === "production") throw new Error("Defina DEMO_PASSWORD (o conecte SQL Server) antes de ejecutar en producción.");
  return "dmc2026";
}

function credsFor(username: string): Cred | undefined {
  g.__dmcCreds ??= new Map();
  if (!g.__dmcCreds.has(username)) {
    if (!store.usuarios.some((u) => u.username === username)) return undefined;
    g.__dmcCreds.set(username, hashPassword(demoPassword()));
  }
  return g.__dmcCreds.get(username);
}

/** Verifica en tiempo constante, también cuando el usuario no existe (evita enumerar usuarios por tiempos). */
export function verifyLogin(username: string, password: string): Usuario | null {
  const real = credsFor(username);
  g.__dmcDummy ??= hashPassword(randomBytes(12).toString("hex"));
  const c = real ?? g.__dmcDummy;
  const candidate = scryptSync(password, c.salt, 64);
  const ok = timingSafeEqual(candidate, c.hash) && !!real;
  return ok ? (store.usuarios.find((u) => u.username === username) ?? null) : null;
}

// ───────────── Límite de intentos (en memoria; con varias instancias usar Redis/SQL) ─────────────

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;

export async function clientKey(username: string): Promise<string> {
  const h = await headers();
  // x-forwarded-for solo es confiable detrás de su propio proxy/balanceador.
  const ip = (h.get("x-forwarded-for") ?? "local").split(",")[0].trim().slice(0, 64);
  return `${ip}|${username}`;
}

/** Claves de límite: por IP+usuario (5 fallos) y por IP sola (20 fallos, frena probar muchos usuarios). */
export async function limiterKeys(username: string): Promise<{ key: string; max: number }[]> {
  const k = await clientKey(username);
  return [{ key: k, max: MAX_FAILS }, { key: k.split("|")[0], max: MAX_FAILS * 4 }];
}

export function isLocked(keys: { key: string; max: number }[]): boolean {
  const m = (g.__dmcLimiter ??= new Map());
  return keys.some(({ key, max }) => {
    const l = m.get(key);
    if (!l) return false;
    if (Date.now() - l.first > WINDOW_MS) {
      m.delete(key);
      return false;
    }
    return l.n >= max;
  });
}
export function registerFail(keys: { key: string; max: number }[]): void {
  const m = (g.__dmcLimiter ??= new Map());
  const now = Date.now();
  for (const { key } of keys) {
    const l = m.get(key);
    if (!l || now - l.first > WINDOW_MS) m.set(key, { n: 1, first: now });
    else l.n++;
  }
  // Tope de memoria: descarta primero lo vencido y luego lo más antiguo (nunca vaciar todo: reiniciaría los bloqueos).
  if (m.size > 5000) {
    for (const [k, v] of m) if (now - v.first > WINDOW_MS) m.delete(k);
    for (const k of m.keys()) { if (m.size <= 4500) break; m.delete(k); }
  }
}
export function clearFails(keys: { key: string; max: number }[]): void {
  // Solo se limpia la clave IP+usuario; el contador por IP sigue su ventana.
  g.__dmcLimiter?.delete(keys[0].key);
}

// ───────────── Sesión ─────────────

const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
} as const;

export async function startSession(username: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, signSession(username), { ...cookieOpts, maxAge: SESSION_TTL_S });
}

export async function endSession(): Promise<void> {
  // Mismos atributos que al crearla (el prefijo __Host- exige Secure y Path=/ también para borrarla).
  (await cookies()).set(SESSION_COOKIE, "", { ...cookieOpts, maxAge: 0, expires: new Date(0) });
}

/** Usuario autenticado o null. El rol se lee de la base en cada petición. */
export const getSession = cache(async (): Promise<Usuario | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const p = verifySession(token);
  if (!p) return null;
  return store.usuarios.find((u) => u.username === p.u) ?? null;
});

/** Para páginas/layouts: redirige a /login si no hay sesión. */
export async function requireSession(): Promise<Usuario> {
  const u = await getSession();
  if (!u) redirect("/login");
  return u;
}

/** Para páginas: además exige un permiso; si no lo tiene vuelve al inicio. */
export async function requirePermission(permiso: Permiso): Promise<Usuario> {
  const u = await requireSession();
  if (!can(u.rol, permiso)) redirect("/");
  return u;
}

export type ActionResult<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

/** Para acciones de servidor y rutas de API: nunca redirige, devuelve un error tipado. */
export async function authorize(permiso?: Permiso): Promise<{ user: Usuario } | { error: string }> {
  const user = await getSession();
  if (!user) return { error: "Su sesión expiró. Vuelva a ingresar." };
  if (permiso && !can(user.rol, permiso)) return { error: "Su perfil no tiene permiso para realizar esta acción." };
  return { user };
}
