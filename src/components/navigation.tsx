"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileUp, History, ShieldAlert, Sparkles, ReceiptText } from "lucide-react";

export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Cargar Archivo", icon: FileUp },
    { href: "/historial", label: "Historial y Bitácora", icon: History },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 no-print">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm font-bold">
              SK
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-lg">FACTURA SKMX</span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                CFDI 4.0
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                    isActive
                      ? "bg-slate-100 text-blue-700 font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-900 text-xs font-medium">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
            <span>DEMO – SIN VALIDEZ FISCAL</span>
          </div>
        </div>
      </div>
    </header>
  );
}

