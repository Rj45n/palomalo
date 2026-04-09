/**
 * GET    /api/fleet/[id]   → détail d'un firewall
 * PATCH  /api/fleet/[id]   → modifier label/url/username/password/tags
 * DELETE /api/fleet/[id]   → supprimer
 */
import { NextRequest, NextResponse } from "next/server";
import { getFirewall, updateFirewall, deleteFirewall, sanitize } from "@/lib/fleet-store";
import { FirewallEntry } from "@/types";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const apiKey = request.cookies.get("panos_api_key")?.value;
  const url    = request.cookies.get("panos_url")?.value;
  if (!apiKey || !url) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const fw = await getFirewall(id);
  if (!fw) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(sanitize(fw));
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const apiKey = request.cookies.get("panos_api_key")?.value;
  const url    = request.cookies.get("panos_url")?.value;
  if (!apiKey || !url) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const body = await request.json() as Partial<Pick<FirewallEntry, "label" | "url" | "username" | "password" | "tags">>;
  const updated = await updateFirewall(id, body);
  if (!updated) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(sanitize(updated));
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const apiKey = request.cookies.get("panos_api_key")?.value;
  const url    = request.cookies.get("panos_url")?.value;
  if (!apiKey || !url) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const ok = await deleteFirewall(id);
  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Introuvable" }, { status: 404 });
}
