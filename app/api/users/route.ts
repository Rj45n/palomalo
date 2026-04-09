/**
 * GET  /api/users  → liste des utilisateurs (admin uniquement)
 * POST /api/users  → créer un utilisateur (admin uniquement)
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllUsers, createUser, sanitizeUser } from "@/lib/user-store";
import { UserRole } from "@/types";

async function requireAdmin(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
  return null;
}

export async function GET(request: NextRequest) {
  const err = await requireAdmin(request);
  if (err) return err;

  const users = await getAllUsers();
  return NextResponse.json(users.map(sanitizeUser));
}

export async function POST(request: NextRequest) {
  const err = await requireAdmin(request);
  if (err) return err;

  const body = await request.json() as { username?: string; email?: string; password?: string; role?: UserRole };
  if (!body.username || !body.email || !body.password || !body.role) {
    return NextResponse.json({ error: "username, email, password, role requis" }, { status: 400 });
  }
  if (!["admin", "operator", "viewer"].includes(body.role)) {
    return NextResponse.json({ error: "Rôle invalide (admin | operator | viewer)" }, { status: 400 });
  }
  if (body.password.length < 8) {
    return NextResponse.json({ error: "Le mot de passe doit contenir au moins 8 caractères" }, { status: 400 });
  }

  try {
    const user = await createUser({ username: body.username, email: body.email, password: body.password, role: body.role });
    return NextResponse.json(sanitizeUser(user), { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur" }, { status: 409 });
  }
}
