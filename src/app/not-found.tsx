import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="flex max-w-[520px] flex-col items-start gap-4">
        <span className="kicker">Error 404</span>
        <h1 className="text-[clamp(40px,8vw,72px)] leading-[0.95] tracking-[-0.045em]">No encontrado</h1>
        <p className="text-[15px] text-n700">La página, cotización o producto que busca no existe o ya no está disponible.</p>
        <Link href="/" className="btn btn-primary no-underline">Volver al inicio</Link>
      </div>
    </main>
  );
}
