/**
 * Middleware Next.js — Protection des routes
 * Toutes les routes /dashboard/* nécessitent une session valide.
 * Les routes /api/* (sauf /api/auth/*) nécessitent aussi une session.
 * Redirige vers /login si non authentifié.
 */
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Routes publiques : page de connexion PAN-OS et auth NextAuth
  const isPublic =
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/connect") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon");

  if (isPublic) return NextResponse.next();

  // Vérifier la session
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Vérifier les permissions par rôle pour les routes sensibles
  const role = req.auth.user?.role ?? "viewer";

  // Routes admin uniquement
  const adminOnly = ["/dashboard/users", "/api/users"];
  if (adminOnly.some(r => pathname.startsWith(r)) && role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Routes operator+ (écriture)
  const operatorRoutes = ["/api/fleet", "/api/alerts/config", "/api/diagnostic-live"];
  if (operatorRoutes.some(r => pathname.startsWith(r)) && role === "viewer") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
  // Forcer Node.js runtime pour bcrypt et fs (pas Edge)
  runtime: "nodejs",
};
