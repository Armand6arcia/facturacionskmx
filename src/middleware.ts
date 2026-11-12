import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "./lib/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  const sessionUser = token ? await verifySessionToken(token) : null;

  // Si ya está autenticado e intenta acceder a /login, llevarlo al dashboard
  if (pathname === "/login") {
    if (sessionUser) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Si no está autenticado e intenta entrar a páginas protegidas
  if (!sessionUser) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/historial/:path*",
    "/documentos/:path*",
    "/usuarios/:path*",
    "/login",
  ],
};

