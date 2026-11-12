"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  History,
  Plus,
  Users,
  LogOut,
  User as UserIcon,
  Shield,
} from "lucide-react";

interface CurrentUser {
  id: string;
  nombre: string;
  usuario?: string;
  correo: string;
  rol: string;
}

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    if (pathname === "/login") return;

    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
        }
      })
      .catch(() => setCurrentUser(null));
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    setCurrentUser(null);
    router.push("/login");
    router.refresh();
  };

  // En la pantalla de login no mostramos el menú de navegación
  if (pathname === "/login") {
    return null;
  }

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/historial", label: "Historial CFDI", icon: History },
    ...(currentUser?.rol === "ADMIN"
      ? [{ href: "/usuarios", label: "Usuarios", icon: Users }]
      : []),
  ];

  const initials = currentUser?.nombre
    ? currentUser.nombre
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "SK";

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
          <Link
            href="/#nueva-factura"
            onClick={() => {
              if (pathname === "/") {
                document.getElementById("fileInput")?.click();
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nueva Factura</span>
            <span className="sm:hidden">Nueva</span>
          </Link>

          {/* User Profile Pill & Logout */}
          {currentUser && (
            <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-200">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shadow-xs">
                  {initials}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800 leading-tight">
                      {currentUser.nombre}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                        currentUser.rol === "ADMIN"
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}
                    >
                      {currentUser.rol === "ADMIN" ? "Admin" : "Facturador"}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {currentUser.usuario ? `@${currentUser.usuario}` : currentUser.correo}
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Cerrar Sesión"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
