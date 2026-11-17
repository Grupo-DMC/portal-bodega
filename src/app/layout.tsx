import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { connection } from "next/server";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], weight: ["400", "600", "800"], variable: "--font-archivo", display: "swap" });

export const metadata: Metadata = {
  title: { default: "DMC Bodega", template: "%s · DMC Bodega" },
  description: "Control de inventario de Comercializadora DMC S.P.A.: stock, despachos por cotización, entradas y movimientos.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#201e1d", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Render dinámico en todas las rutas: el CSP con nonce (proxy.ts) solo funciona si el HTML se genera por petición.
  await connection();
  return (
    <html lang="es-CL" className={archivo.variable}>
      <body>
        <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
