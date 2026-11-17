"use client";

import { useState } from "react";
import { cerrarCotizacionAction } from "@/actions/operaciones";
import { useRun } from "@/components/controls";
import { Dialog } from "@/components/Dialog";

export function CerrarSaldo({ id, pendiente }: { id: string; pendiente: string }) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [tried, setTried] = useState(false);
  const { pending, error, run } = useRun();
  const bad = tried && !motivo.trim();

  return (
    <>
      <button type="button" className="btn btn-outline btn-sm" onClick={() => { setOpen(true); setMotivo(""); setTried(false); }}>Cerrar con saldo</button>
      {open && (
        <Dialog label={`Cerrar ${id} con saldo`} onClose={() => setOpen(false)} className="max-w-[520px] !text-left">
          <div className="border-b border-n300 px-6 py-5 text-left">
            <div className="kicker mb-1.5">Cerrar con saldo</div>
            <h3 className="text-[28px]">{id}</h3>
          </div>
          <div className="flex flex-col gap-3.5 px-6 py-5 text-left">
            <p className="text-sm text-n800">Se cerrará la cotización con <b>{pendiente}</b> pendientes. La reserva de ese saldo se libera y vuelve al stock libre.</p>
            <div className="field">
              <label className="label" htmlFor="motivo-cierre">Motivo (obligatorio)</label>
              <textarea id="motivo-cierre" data-autofocus className="input" maxLength={400} value={motivo} aria-invalid={bad} placeholder="Ej: cliente redujo el alcance del proyecto" onChange={(e) => setMotivo(e.target.value)} />
              {bad && <span className="field-err" role="alert">Debe indicar el motivo del cierre.</span>}
              {error && <span className="field-err" role="alert">{error}</span>}
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t-2 border-divider px-6 py-4">
            <button type="button" className="btn btn-outline" onClick={() => setOpen(false)}>Cancelar</button>
            <button type="button" className="btn btn-primary" disabled={pending} onClick={() => {
              if (!motivo.trim()) { setTried(true); return; }
              run(() => cerrarCotizacionAction({ id, motivo }), () => setOpen(false));
            }}>{pending ? "Cerrando…" : "Cerrar y liberar reserva"}</button>
          </div>
        </Dialog>
      )}
    </>
  );
}
