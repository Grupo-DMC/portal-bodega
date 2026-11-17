"use client";

import { useActionState } from "react";
import { CircleAlert, Search } from "lucide-react";
import { buscarCotizacionAction, type FormState } from "@/actions/operaciones";

export function BuscarCot() {
  const [state, action, pending] = useActionState<FormState, FormData>(buscarCotizacionAction, {});
  return (
    <form action={action} className="flex w-full max-w-[760px] flex-col gap-3.5" noValidate>
      <label htmlFor="n" className="text-xs font-bold uppercase tracking-[0.18em]">N° de cotización</label>
      <div className="flex flex-col border-2 border-ink bg-white focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent sm:flex-row">
        <div className="flex flex-1 items-center">
          <span className="pl-4 text-[clamp(26px,5vw,40px)] font-extrabold tracking-[-0.03em] text-n500 sm:pl-6" aria-hidden>COT</span>
          <input
            id="n" name="n" inputMode="numeric" autoComplete="off" maxLength={12} placeholder="20887" autoFocus
            aria-describedby="n-ayuda n-err" aria-invalid={!!state.error}
            className="min-w-0 flex-1 border-0 bg-transparent py-[18px] pl-2 pr-4 text-[clamp(26px,5vw,40px)] font-extrabold tracking-[-0.03em] text-ink outline-none placeholder:text-n300 focus-visible:outline-none"
          />
        </div>
        <button type="submit" disabled={pending} className="btn btn-primary !min-h-14 !px-10 !text-base !tracking-[0.12em]">
          <Search size={20} strokeWidth={2.4} aria-hidden />{pending ? "Buscando…" : "Buscar"}
        </button>
      </div>
      <div id="n-err" aria-live="polite">
        {state.error && <div className="flex items-center gap-2 text-sm font-semibold text-a700"><CircleAlert size={16} aria-hidden />{state.error}</div>}
      </div>
      <p id="n-ayuda" className="text-[13px] text-muted">Ingrese el número de una cotización aprobada. Se abrirá el detalle con lo pendiente por despachar y el stock por bodega.</p>
    </form>
  );
}
