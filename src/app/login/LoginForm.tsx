"use client";

import { useActionState, useState } from "react";
import { ArrowRight } from "lucide-react";
import { loginAction, type LoginState } from "@/actions/auth";

const DEMO = [
  { u: "avidal", l: "avidal · Admin" },
  { u: "lperez", l: "lperez · Bodeguero" },
  { u: "gcoloma", l: "gcoloma · Ventas" },
];

export function LoginForm({ showDemo, demoHint }: { showDemo: boolean; demoHint: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const [user, setUser] = useState(state.username ?? "");

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <div className="field">
        <label className="label" htmlFor="username">Usuario</label>
        <input id="username" name="username" className="input !min-h-12 !text-base" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={32} required value={user} onChange={(e) => setUser(e.target.value)} aria-invalid={!!state.error} />
      </div>
      <div className="field">
        <label className="label" htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" className="input !min-h-12 !text-base" autoComplete="current-password" maxLength={128} required aria-invalid={!!state.error} />
      </div>
      {state.error && <p className="text-[13px] font-semibold text-a700" role="alert">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn btn-primary btn-wide !min-h-[52px] !px-5 !text-sm">
        {pending ? "Ingresando…" : "Ingresar al sistema"} <ArrowRight size={18} aria-hidden />
      </button>
      {showDemo && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>Usuarios demo:</span>
          {DEMO.map((d) => (
            <button key={d.u} type="button" onClick={() => setUser(d.u)} className="min-h-8 cursor-pointer border border-n300 bg-white px-2 py-1 text-xs hover:bg-n100">{d.l}</button>
          ))}
          {demoHint && <span className="w-full">Contraseña de demostración: <b className="text-ink">{demoHint}</b></span>}
        </div>
      )}
    </form>
  );
}
