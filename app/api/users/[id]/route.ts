/**
 * PATCH  /api/users/[id]  → modifier email, rôle, mot de passe
 * DELETE /api/users/[id]  → supprimer (admin uniquement)
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateUser, deleteUser, sanitizeUser, getUserById } from "@/lib/user-store";
import { UserRole } from "@/types";

async function requireAdmin() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
  return null;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const err = await requireAdmin();
  if (err) return err;

  const { id } = await params;
  const body = await request.json() as { email?: string; role?: UserRole; password?: string };

  if (body.role && !["admin", "operator", "viewer"].includes(body.role)) {
    return NextResponse.json({ error: "Rôle invalide" }, { status: 400 });
  }
  if (body.password && body.password.length < 8) {
    return NextResponse.json({ error: "Mot de passe trop court (min 8 caractères)" }, { status: 400 });
  }

  const updated = await updateUser(id, body);
  if (!updated) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  return NextResponse.json(sanitizeUser(updated));
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const err = await requireAdmin();
  if (err) return err;

  const { id } = await params;

  // Empêcher l'auto-suppression
  const session = await auth();
  if (session?.user.id === id) {
    return NextResponse.json({ error: "Vous ne pouvez pas supprimer votre propre compte." }, { status: 400 });
  }

  try {
    const ok = await deleteUser(id);
    return ok
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur" }, { status: 400 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const err = await requireAdmin();
  if (err) return err;

  const { id } = await params;
  const user = await getUserById(id);
  if (!user) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(sanitizeUser(user));
}
