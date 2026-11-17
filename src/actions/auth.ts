"use server";

import { redirect } from "next/navigation";
import { loginSchema } from "@/lib/schemas";
import { clearFails, endSession, isLocked, limiterKeys, registerFail, startSession, verifyLogin } from "@/server/auth";

export type LoginState = { error?: string; username?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ username: formData.get("username"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos.", username: String(formData.get("username") ?? "").slice(0, 32) };
  const { username, password } = parsed.data;

  const key = await limiterKeys(username);
  if (isLocked(key)) return { error: "Demasiados intentos fallidos. Espere unos minutos e intente nuevamente.", username };

  const user = verifyLogin(username, password);
  if (!user) {
    registerFail(key);
    // Mensaje genérico: no revela si el usuario existe.
    return { error: "Usuario o contraseña incorrectos.", username };
  }
  clearFails(key);
  await startSession(user.username);
  redirect(user.rol === "Bodeguero" ? "/despacho" : "/");
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/login");
}
