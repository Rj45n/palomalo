import { NextRequest, NextResponse } from "next/server";
import {
  getResourceMonitor,
  getGlobalCounters,
  getHAStatus,
  getRoutingSummary,
  getBGPSummary,
  getVPNIKE,
  getVPNIPSec,
  getGlobalProtectUsers,
} from "@/lib/panos";
import {
  parseResourceMonitor,
  parseGlobalCounters,
  parseHAStatus,
  parseRoutingSummary,
  parseBGPSummary,
  parseVPNIKE,
  parseVPNIPSec,
  parseGlobalProtect,
} from "@/lib/advanced-parsers";
import { AdvancedMetrics } from "@/types";

/**
 * API Route pour récupérer les métriques avancées TAC-level
 * GET /api/metrics-advanced
 * Nécessite une session active (cookies)
 */
export async function GET(request: NextRequest) {
  try {
    // Récupérer la clé API et l'URL depuis les cookies
    const apiKey = request.cookies.get("panos_api_key")?.value;
    const url = request.cookies.get("panos_url")?.value;

    if (!apiKey || !url) {
      return NextResponse.json(
        { error: "Session expirée" },
        { status: 401 }
      );
    }

    // Initialiser les métriques avec valeurs par défaut
    const metrics: AdvancedMetrics = {
      resourceMonitor: {
        dataplane: [],
        packetDescriptor: 0,
        sessionUtilization: 0,
        bufferUtilization: 0,
      },
      counters: {
        drops: [],
        warnings: [],
      },
      ha: {
        enabled: false,
        localState: "disabled",
        peerState: "unknown",
        syncStatus: "unknown",
      },
      routing: {
        totalRoutes: 0,
        bgpPeers: [],
        ospfNeighbors: [],
      },
      vpn: {
        ikeSa: [],
        ipsecSa: [],
      },
    };

    // Récupérer toutes les métriques en parallèle avec gestion d'erreurs
    const results = await Promise.allSettled([
      getResourceMonitor(url, apiKey),
      getGlobalCounters(url, apiKey, "drop"),
      getHAStatus(url, apiKey),
      getRoutingSummary(url, apiKey),
      getBGPSummary(url, apiKey),
      getVPNIKE(url, apiKey),
      getVPNIPSec(url, apiKey),
      getGlobalProtectUsers(url, apiKey),
    ]);

    // Parser les résultats avec gestion d'erreurs
    if (results[0].status === "fulfilled") {
      try {
        metrics.resourceMonitor = parseResourceMonitor(results[0].value);
      } catch (e) {
        console.error("Erreur parsing resource monitor:", e);
      }
    }

    if (results[1].status === "fulfilled") {
      try {
        metrics.counters = parseGlobalCounters(results[1].value);
      } catch (e) {
        console.error("Erreur parsing counters:", e);
      }
    }

    if (results[2].status === "fulfilled") {
      try {
        metrics.ha = parseHAStatus(results[2].value);
      } catch (e) {
        console.error("Erreur parsing HA:", e);
      }
    }

    if (results[3].status === "fulfilled") {
      try {
        metrics.routing = parseRoutingSummary(results[3].value);
      } catch (e) {
        console.error("Erreur parsing routing:", e);
      }
    }

    if (results[4].status === "fulfilled") {
      try {
        metrics.routing.bgpPeers = parseBGPSummary(results[4].value);
      } catch (e) {
        console.error("Erreur parsing BGP:", e);
      }
    }

    if (results[5].status === "fulfilled") {
      try {
        metrics.vpn.ikeSa = parseVPNIKE(results[5].value);
      } catch (e) {
        console.error("Erreur parsing VPN IKE:", e);
      }
    }

    if (results[6].status === "fulfilled") {
      try {
        metrics.vpn.ipsecSa = parseVPNIPSec(results[6].value);
      } catch (e) {
        console.error("Erreur parsing VPN IPSec:", e);
      }
    }

    if (results[7].status === "fulfilled") {
      try {
        metrics.globalProtect = parseGlobalProtect(results[7].value);
      } catch (e) {
        console.error("Erreur parsing GlobalProtect:", e);
      }
    }

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Erreur lors de la récupération des métriques avancées:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de la récupération des métriques avancées",
      },
      { status: 500 }
    );
  }
}
