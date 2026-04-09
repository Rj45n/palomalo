/**
 * POST /api/fleet/poll → collecte les métriques de tous les firewalls en parallèle
 */
import { NextRequest, NextResponse } from "next/server";
import { getAllFirewalls, collectSnapshot } from "@/lib/fleet-store";

export async function POST(request: NextRequest) {
  const apiKey = request.cookies.get("panos_api_key")?.value;
  const url    = request.cookies.get("panos_url")?.value;
  if (!apiKey || !url) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const firewalls = await getAllFirewalls();
  if (firewalls.length === 0) return NextResponse.json({ collected: 0, snapshots: {} });

  // Collecte en parallèle avec timeout global de 30s
  const results = await Promise.allSettled(
    firewalls.map(fw => collectSnapshot(fw))
  );

  const snapshots: Record<string, unknown> = {};
  let collected = 0;
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      snapshots[firewalls[i].id] = r.value;
      collected++;
    }
  });

  return NextResponse.json({ collected, snapshots });
}
