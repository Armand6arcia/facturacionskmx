import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/navigation";

export const metadata: Metadata = {
  title: "Factura SKMX - Sistema Demo CFDI 4.0",
  description: "MVP demostrativo para lectura de comprobantes internos y timbrado CFDI 4.0 en México",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-900">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 sm:px-6 py-6 max-w-7xl">
          {children}
        </main>
        <footer className="border-t py-4 text-center text-xs text-slate-500 bg-white no-print">
          Sistema Demostrativo CFDI 4.0 • MockPacClient activo (Variable PAC_PROVIDER=mock) • Moneda MXN
        </footer>
      </body>
    </html>
  );
}
