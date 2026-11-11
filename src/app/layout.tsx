import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/navigation";

export const metadata: Metadata = {
  title: "StyleKorean MX - Facturación CFDI 4.0",
  description: "Sistema oficial de facturación electrónica y emisión CFDI 4.0 para StyleKorean MX",
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
          StyleKorean MX • Emisión de Comprobantes Fiscales Digitales por Internet (CFDI 4.0)
        </footer>
      </body>
    </html>
  );
}
