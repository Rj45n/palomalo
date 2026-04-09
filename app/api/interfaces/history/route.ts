/**
 * API pour l'historique temps réel des interfaces
 * GET /api/interfaces/history?name=ethernet1/1  → historique d'une interface
 * GET /api/interfaces/history                   → snapshot de toutes les interfaces + calcul débit
 * POST /api/interfaces/history                  → injecte un nouveau snapshot (appelé par le poller)
 *
 * Stockage en mémoire (ring buffer de 60 points = ~5 minutes à 5s d'intervalle)
 */

import { NextRequest, NextResponse } from "next/server";
import { getInterfaceStats } from "@/lib/panos";
import { InterfaceStats } from "@/types";

// Point de données horodaté pour une interface
export interface InterfaceDataPoint {
  timestamp: number;
  rx: number;
  tx: number;
  rxPackets: number;
  txPackets: number;
  rxErrors: number;
  txErrors: number;
  rxDrops: number;
  txDrops: number;
  // Débits calculés (delta entre deux points)
  rxBps?: number;
  txBps?: number;
  rxPps?: number;
  txPps?: number;
}

// Ring buffer par nom d'interface (max 60 points)
const HISTORY_SIZE = 60;
const interfaceHistory = new Map<string, InterfaceDataPoint[]>();
// Dernier snapshot brut pour calcul delta
const lastSnapshot = new Map<string, InterfaceDataPoint>();

function addPoint(name: string, point: InterfaceDataPoint) {
  if (!interfaceHistory.has(name)) {
    interfaceHistory.set(name, []);
  }
  const buf = interfaceHistory.get(name)!;

  // Calculer les débits par rapport au snapshot précédent
  const prev = lastSnapshot.get(name);
  if (prev && point.timestamp > prev.timestamp) {
    const dtSec = (point.timestamp - prev.timestamp) / 1000;
    point.rxBps  = Math.max(0, Math.round((point.rx - prev.rx) / dtSec));
    point.txBps  = Math.max(0, Math.round((point.tx - prev.tx) / dtSec));
    point.rxPps  = Math.max(0, Math.round((point.rxPackets - prev.rxPackets) / dtSec));
    point.txPps  = Math.max(0, Math.round((point.txPackets - prev.txPackets) / dtSec));
  }

  lastSnapshot.set(name, { ...point });
  buf.push(point);
  if (buf.length > HISTORY_SIZE) buf.shift();
}

/**
 * GET — retourne l'historique d'une interface ou de toutes
 */
export async function GET(request: NextRequest) {
  const apiKey = request.cookies.get("panos_api_key")?.value;
  const url    = request.cookies.get("panos_url")?.value;
  if (!apiKey || !url) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const name = request.nextUrl.searchParams.get("name");

  if (name) {
    // Historique d'une interface spécifique + snapshot live
    const [liveResult] = await Promise.allSettled([getInterfaceStats(url, apiKey, name)]);
    if (liveResult.status === "fulfilled" && liveResult.value) {
      const live = parseLiveStats(liveResult.value, name);
      if (live) {
        addPoint(name, { timestamp: Date.now(), ...live });
      }
    }

    const history = interfaceHistory.get(name) ?? [];
    return NextResponse.json({ name, history });
  }

  // Snapshot de toutes les interfaces en cache (pas de fetch live ici)
  const all: Record<string, InterfaceDataPoint[]> = {};
  for (const [k, v] of interfaceHistory.entries()) {
    all[k] = v;
  }
  return NextResponse.json({ interfaces: all });
}

/**
 * POST — reçoit un tableau de snapshots d'interfaces depuis le dashboard
 * Body: { interfaces: InterfaceStats[] }
 */
export async function POST(request: NextRequest) {
  const apiKey = request.cookies.get("panos_api_key")?.value;
  const url    = request.cookies.get("panos_url")?.value;
  if (!apiKey || !url) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = await request.json() as { interfaces: InterfaceStats[] };
    const now = Date.now();

    for (const iface of body.interfaces) {
      addPoint(iface.name, {
        timestamp: now,
        rx:        iface.rx,
        tx:        iface.tx,
        rxPackets: iface.rxPackets,
        txPackets: iface.txPackets,
        rxErrors:  iface.rxErrors,
        txErrors:  iface.txErrors,
        rxDrops:   iface.rxDrops,
        txDrops:   iface.txDrops,
      });
    }

    return NextResponse.json({ ok: true, stored: body.interfaces.length });
  } catch {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }
}

// Parse la réponse XML de getInterfaceStats en objet plat
function parseLiveStats(xml: any, name: string): Omit<InterfaceDataPoint, "timestamp"> | null {
  try {
    const hw = xml?.response?.result?.hw;
    if (!hw) return null;
    return {
      rx:        parseInt(hw["ibytes"]  ?? hw["rcvbyte"]  ?? "0", 10),
      tx:        parseInt(hw["obytes"]  ?? hw["sndbyte"]  ?? "0", 10),
      rxPackets: parseInt(hw["ipackets"] ?? hw["rcvpkt"]  ?? "0", 10),
      txPackets: parseInt(hw["opackets"] ?? hw["sndpkt"]  ?? "0", 10),
      rxErrors:  parseInt(hw["ierrors"]  ?? hw["rcverr"]  ?? "0", 10),
      txErrors:  parseInt(hw["oerrors"]  ?? hw["snderr"]  ?? "0", 10),
      rxDrops:   parseInt(hw["idrops"]   ?? hw["rcvdrop"] ?? "0", 10),
      txDrops:   parseInt(hw["odrops"]   ?? hw["snddrop"] ?? "0", 10),
    };
  } catch {
    return null;
  }
}
