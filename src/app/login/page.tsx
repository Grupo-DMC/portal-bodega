import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Ingresar" };

export default function LoginPage() {
  // Los accesos de demostración solo existen mientras se usan datos ficticios y nunca en producción.
  const showDemo = process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_SHOW_DEMO_USERS === "1";
  const demoHint = showDemo && !process.env.DEMO_PASSWORD ? "dmc2026" : "";

  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-2">
      <div className="flex min-h-dvh flex-col px-6 py-8 sm:px-12 lg:px-16 lg:py-10">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b-2 border-divider pb-5">
          <div className="flex flex-col leading-none">
            <span className="text-[34px] font-extrabold tracking-[-0.05em] text-brand">dMC</span>
            <span className="mt-[3px] text-[8px] uppercase tracking-[0.12em] text-brand">Ideas tecnológicas de seguridad</span>
          </div>
          <div className="hidden w-px self-stretch bg-n300 sm:block" aria-hidden />
          <div className="flex flex-col gap-0.5 text-[11px] uppercase tracking-[0.14em]">
            <span className="font-semibold">Comercializadora DMC S.P.A.</span>
            <span className="text-muted">Versión 1.0 · {new Date().getFullYear()}</span>
          </div>
        </div>

        <main className="flex max-w-[440px] flex-1 flex-col justify-center py-12">
          <span className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-a700">Control de inventario</span>
          <h1 className="mb-4 text-[clamp(44px,8vw,72px)] leading-[0.95] tracking-[-0.045em]">DMC Bodega</h1>
          <p className="mb-10 text-[15px] text-n700">Stock, despachos por cotización, entradas y movimientos de las bodegas de Comercializadora DMC.</p>
          <LoginForm showDemo={showDemo} demoHint={demoHint} />
        </main>

        <footer className="text-[11px] tracking-[0.06em] text-muted">© {new Date().getFullYear()} Comercializadora DMC S.P.A. · Madrid 1269, Santiago</footer>
      </div>

      <div
        className="relative hidden flex-col justify-end overflow-hidden bg-accent text-white lg:flex"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.09) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.09) 1px,transparent 1px)",
          backgroundSize: "72px 72px",
        }}
        aria-hidden
      >
        <div className="px-16 pb-12">
          <div className="text-[clamp(120px,18vw,260px)] font-extrabold leading-[0.8] tracking-[-0.07em]">DMC</div>
          <div className="mt-6 text-[clamp(36px,4.4vw,64px)] font-extrabold leading-none tracking-[-0.03em]">Bodega</div>
          <div className="mt-10 h-[3px] w-full bg-white" />
        </div>
        <div className="flex flex-wrap gap-6 border-t border-white/35 bg-a700 px-16 py-[18px] text-xs font-semibold uppercase tracking-[0.18em]">
          <span>Inventario</span><span>·</span><span>Despachos</span><span>·</span><span>Entradas</span><span>·</span><span>Movimientos</span><span>·</span><span>Reservas</span>
        </div>
      </div>
    </div>
  );
}
