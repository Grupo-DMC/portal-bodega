"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // No se muestra el mensaje del error: puede contener detalles internos. Solo queda en el log del servidor.
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="flex max-w-[520px] flex-col items-start gap-4">
        <span className="kicker">Error inesperado</span>
        <h1 className="text-[clamp(36px,7vw,60px)] leading-[0.95] tracking-[-0.045em]">Algo salió mal</h1>
        <p className="text-[15px] text-n700">No pudimos completar la operación. Sus datos no se modificaron. Intente nuevamente.</p>
        <button type="button" className="btn btn-primary" onClick={reset}>Reintentar</button>
      </div>
    </main>
  );
}
