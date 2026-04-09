/**
 * POST /api/fleet/[id]/metrics → déclenche la collecte des métriques pour un firewall
 * GET  /api/fleet/[id]/metrics → retourne le dernier snapshot
 */
import { NextRequest, NextResponse } from "next/server";
import { getFirewall, getAllSnapshots, collectSnapshot } from "@/lib/fleet-store";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const apiKey = request.cookies.get("panos_api_key")?.value;
  const url    = request.cookies.get("panos_url")?.value;
  if (!apiKey || !url) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const snapshots = await getAllSnapshots();
  const snapshot  = snapshots[id];
  if (!snapshot) return NextResponse.json({ error: "Aucun snapshot disponible" }, { status: 404 });
  return NextResponse.json(snapshot);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const apiKey = request.cookies.get("panos_api_key")?.value;
  const url    = request.cookies.get("panos_url")?.value;
  if (!apiKey || !url) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const fw = await getFirewall(id);
  if (!fw) return NextResponse.json({ error: "Firewall introuvable" }, { status: 404 });

  const snapshot = await collectSnapshot(fw);
  return NextResponse.json(snapshot);
}
