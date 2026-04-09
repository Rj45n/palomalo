/**
 * Analyseur d'interfaces pour détecter les problèmes
 * Basé sur les best practices Palo Alto Networks
 */

import { InterfaceStats, InterfaceIssue } from "@/types";

// Cache pour stocker les valeurs précédentes des compteurs
interface InterfaceCounters {
  rxErrors: number;
  txErrors: number;
  rxDrops: number;
  txDrops: number;
  timestamp: number;
}

const interfaceCountersCache = new Map<string, InterfaceCounters>();

/**
 * Analyse les interfaces et détecte les problèmes ACTIFS uniquement
 * Compare avec les valeurs précédentes pour ignorer les problèmes passés
 * @param interfaces - Liste des interfaces à analyser
 * @returns Liste des problèmes détectés
 */
export function analyzeInterfaces(interfaces: InterfaceStats[]): InterfaceIssue[] {
  const issues: InterfaceIssue[] = [];
  const now = Date.now();

  interfaces.forEach((iface) => {
    const ifaceName = iface.name.split(" (")[0]; // Enlever le commentaire
    const previousCounters = interfaceCountersCache.get(ifaceName);

    // Problème critique : Interface down
    if (iface.status === "down") {
      issues.push({
        interface: iface.name,
        severity: "critical",
        type: "down",
        message: `Interface ${iface.name} est DOWN`,
        recommendation: "Vérifier le câble, la configuration et l'état du port distant",
        cliCommand: `show interface ${ifaceName}`,
      });
    }

    // Vérifier si les erreurs augmentent (problème actif)
    if (previousCounters) {
      const rxErrorsDelta = iface.rxErrors - previousCounters.rxErrors;
      const txErrorsDelta = iface.txErrors - previousCounters.txErrors;
      const totalErrorsDelta = rxErrorsDelta + txErrorsDelta;

      // Seulement si les erreurs augmentent
      if (totalErrorsDelta > 0) {
        const timeDiffSec = (now - previousCounters.timestamp) / 1000;
        const errorsPerSec = totalErrorsDelta / timeDiffSec;

        issues.push({
          interface: iface.name,
          severity: errorsPerSec > 1 ? "critical" : "warning",
          type: "errors",
          message: `${totalErrorsDelta} nouvelles erreurs (${errorsPerSec.toFixed(1)}/s) - RX: ${rxErrorsDelta}, TX: ${txErrorsDelta}`,
          recommendation:
            "Problème ACTIF détecté. Vérifier immédiatement la qualité du câble, les paramètres duplex/speed, et les CRC errors",
          cliCommand: `show counter interface ${ifaceName}`,
        });
      }

      // Vérifier si les drops augmentent (problème actif)
      const rxDropsDelta = iface.rxDrops - previousCounters.rxDrops;
      const txDropsDelta = iface.txDrops - previousCounters.txDrops;
      const totalDropsDelta = rxDropsDelta + txDropsDelta;

      // Seulement si les drops augmentent
      if (totalDropsDelta > 0) {
        const timeDiffSec = (now - previousCounters.timestamp) / 1000;
        const dropsPerSec = totalDropsDelta / timeDiffSec;

        issues.push({
          interface: iface.name,
          severity: dropsPerSec > 100 ? "critical" : "warning",
          type: "drops",
          message: `${totalDropsDelta} nouveaux drops (${dropsPerSec.toFixed(1)}/s) - RX: ${rxDropsDelta}, TX: ${txDropsDelta}`,
          recommendation:
            "Problème ACTIF détecté. Vérifier la bande passante disponible, les queues, et les politiques QoS",
          cliCommand: `show counter global filter packet-filter yes delta yes`,
        });
      }
    } else {
      // Première mesure : afficher un message informatif si des compteurs sont non-nuls
      if (iface.rxErrors > 0 || iface.txErrors > 0) {
        const totalErrors = iface.rxErrors + iface.txErrors;
        issues.push({
          interface: iface.name,
          severity: "info",
          type: "errors",
          message: `${totalErrors} erreurs historiques (RX: ${iface.rxErrors}, TX: ${iface.txErrors}) - Surveillance en cours...`,
          recommendation:
            "Compteurs non-nuls détectés. Surveillance active pour détecter si le problème persiste.",
          cliCommand: `show counter interface ${ifaceName}`,
        });
      }

      if (iface.rxDrops > 0 || iface.txDrops > 0) {
        const totalDrops = iface.rxDrops + iface.txDrops;
        issues.push({
          interface: iface.name,
          severity: "info",
          type: "drops",
          message: `${totalDrops} drops historiques (RX: ${iface.rxDrops}, TX: ${iface.txDrops}) - Surveillance en cours...`,
          recommendation:
            "Compteurs non-nuls détectés. Surveillance active pour détecter si le problème persiste.",
          cliCommand: `show counter global filter packet-filter yes delta yes`,
        });
      }
    }

    // Mettre à jour le cache
    interfaceCountersCache.set(ifaceName, {
      rxErrors: iface.rxErrors,
      txErrors: iface.txErrors,
      rxDrops: iface.rxDrops,
      txDrops: iface.txDrops,
      timestamp: now,
    });

    // Problème warning : Haute utilisation (toujours pertinent)
    if (iface.utilization && iface.utilization > 85) {
      issues.push({
        interface: iface.name,
        severity: iface.utilization > 95 ? "critical" : "warning",
        type: "high-utilization",
        message: `Utilisation élevée : ${iface.utilization}%`,
        recommendation:
          "Considérer l'ajout de bande passante ou l'optimisation du trafic",
        cliCommand: `show interface ${ifaceName}`,
      });
    }
  });

  // Trier par sévérité (critical > warning > info)
  return issues.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

/**
 * Réinitialise le cache des compteurs (utile pour les tests)
 */
export function resetInterfaceCountersCache() {
  interfaceCountersCache.clear();
}

/**
 * Calcule l'utilisation d'une interface en pourcentage
 * @param rx - Bytes reçus
 * @param tx - Bytes transmis
 * @param speed - Vitesse de l'interface (ex: "1000Mbps")
 * @param interval - Intervalle de temps en secondes (défaut: 30s)
 * @returns Utilisation en pourcentage
 */
export function calculateUtilization(
  rx: number,
  tx: number,
  speed: string,
  interval: number = 30
): number {
  // Parser la vitesse (ex: "1000Mbps" -> 1000)
  const speedMatch = speed.match(/(\d+)/);
  if (!speedMatch) return 0;

  const speedMbps = parseInt(speedMatch[1], 10);
  const speedBps = speedMbps * 1000000; // Convertir en bits par seconde

  // Calculer le throughput total (RX + TX) en bits par seconde
  const totalBytes = rx + tx;
  const totalBits = totalBytes * 8;
  const throughputBps = totalBits / interval;

  // Calculer l'utilisation en pourcentage
  const utilization = (throughputBps / speedBps) * 100;

  return Math.min(Math.round(utilization * 100) / 100, 100);
}
