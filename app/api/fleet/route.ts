/**
 * GET  /api/fleet          → liste des firewalls (sans mots de passe) + snapshots
 * POST /api/fleet          → ajouter un firewall
 */
import { NextRequest, NextResponse } from "next/server";
import {
  getAllFirewalls,
  getAllSnapshots,
  addFirewall,
  sanitize,
} from "@/lib/fleet-store";
import { FirewallEntry, FleetSummary } from "@/types";

export async function GET(request: NextRequest) {
  const apiKey = request.cookies.get("panos_api_key")?.value;
  const url    = request.cookies.get("panos_url")?.value;
  if (!apiKey || !url) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const [firewalls, snapshots] = await Promise.all([getAllFirewalls(), getAllSnapshots()]);
  const safeFws = firewalls.map(sanitize);

  const online   = safeFws.filter(f => f.status === "online").length;
  const offline  = safeFws.filter(f => f.status === "offline").length;
  const degraded = safeFws.filter(f => f.status === "degraded").length;

  const scores = Object.values(snapshots).map(s => s.healthScore).filter(s => s > 0);
  const avgHealthScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const criticalCount  = Object.values(snapshots).reduce((acc, s) => acc + s.criticalIssues, 0);

  const summary: FleetSummary = {
    total: safeFws.length,
    online,
    offline,
    degraded,
    avgHealthScore,
    criticalCount,
    firewalls: safeFws,
    snapshots,
  };

  return NextResponse.json(summary);
}

export async function POST(request: NextRequest) {
  const apiKey = request.cookies.get("panos_api_key")?.value;
  const url    = request.cookies.get("panos_url")?.value;
  if (!apiKey || !url) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json() as Partial<Pick<FirewallEntry, "label" | "url" | "username" | "password" | "tags">>;
  if (!body.label || !body.url || !body.username || !body.password) {
    return NextResponse.json({ error: "label, url, username, password requis" }, { status: 400 });
  }

  const fw = await addFirewall({
    label:    body.label,
    url:      body.url.replace(/\/$/, ""),
    username: body.username,
    password: body.password,
    tags:     body.tags ?? [],
  });

  return NextResponse.json(sanitize(fw), { status: 201 });
}
