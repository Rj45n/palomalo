/**
 * Moteur de Diagnostic Intelligent
 * Analyse les données live et TSF pour détecter les problèmes
 * Style "Palo Alto TAC Support"
 */

import { 
  DiagnosticIssue, 
  DashboardMetrics, 
  TSFData, 
  TSFAnalysisDeep,
  InterfaceStats, 
  AdvancedMetrics,
  CorrelatedIssue 
} from "@/types";

// Cache pour les compteurs d'interfaces (détection problèmes actifs uniquement)
interface InterfaceCountersCache {
  rxErrors: number;
  txErrors: number;
  rxDrops: number;
  txDrops: number;
  timestamp: number;
}

const diagnosticInterfaceCache = new Map<string, InterfaceCountersCache>();

/**
 * Analyse complète du firewall (live + TSF)
 * @param liveMetrics - Métriques en temps réel
 * @param tsfData - Données du Tech Support File (optionnel)
 * @returns Liste des problèmes détectés
 */
export function analyzeFirewall(
  liveMetrics: DashboardMetrics,
  tsfData?: TSFData
): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];

  // Analyse des métriques système
  issues.push(...analyzeSystemMetrics(liveMetrics));

  // Analyse des interfaces
  issues.push(...analyzeNetworkInterfaces(liveMetrics.interfaces));

  // Analyse des sessions
  issues.push(...analyzeSessions(liveMetrics.sessions));

  // Analyse TSF si disponible
  if (tsfData) {
    issues.push(...analyzeTSFData(tsfData));
  }

  // Trier par sévérité
  return sortBySeverity(issues);
}

/**
 * Analyse les métriques système (CPU, Memory, Disk)
 */
function analyzeSystemMetrics(metrics: DashboardMetrics): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];

  // CPU élevé
  if (metrics.system.cpu > 90) {
    issues.push({
      id: `system-cpu-critical-${Date.now()}`,
      category: "system",
      severity: "critical",
      title: "Utilisation CPU critique",
      description: `L'utilisation CPU est à ${metrics.system.cpu}%, ce qui peut causer des pertes de paquets et des latences.`,
      impact: "Performances dégradées, risque de perte de paquets, latence élevée",
      recommendation:
        "1. Identifier les processus consommateurs avec 'show running resource-monitor'\n2. Vérifier les politiques de sécurité complexes\n3. Considérer l'activation du hardware offload\n4. Vérifier les logs pour des attaques DDoS",
      cliCommands: [
        "show running resource-monitor",
        "show system resources",
        "show counter global filter delta yes",
      ],
      detectedAt: new Date().toISOString(),
      source: "live",
    });
  } else if (metrics.system.cpu > 75) {
    issues.push({
      id: `system-cpu-warning-${Date.now()}`,
      category: "system",
      severity: "warning",
      title: "Utilisation CPU élevée",
      description: `L'utilisation CPU est à ${metrics.system.cpu}%.`,
      impact: "Risque de dégradation des performances si le trafic augmente",
      recommendation:
        "Surveiller l'évolution et identifier les processus consommateurs.",
      cliCommands: ["show system resources", "show running resource-monitor"],
      detectedAt: new Date().toISOString(),
      source: "live",
    });
  }

  // Memory élevée
  if (metrics.system.memory > 90) {
    issues.push({
      id: `system-memory-critical-${Date.now()}`,
      category: "system",
      severity: "critical",
      title: "Mémoire critique",
      description: `L'utilisation mémoire est à ${metrics.system.memory}%.`,
      impact: "Risque de crash du système, OOM killer peut terminer des processus critiques",
      recommendation:
        "1. Vérifier les fuites mémoire avec 'show system resources follow yes'\n2. Réduire le nombre de sessions si possible\n3. Vérifier les logs pour des processus anormaux\n4. Considérer un reboot si nécessaire",
      cliCommands: [
        "show system resources follow yes",
        "show running resource-monitor",
        "show session info",
      ],
      detectedAt: new Date().toISOString(),
      source: "live",
    });
  } else if (metrics.system.memory > 80) {
    issues.push({
      id: `system-memory-warning-${Date.now()}`,
      category: "system",
      severity: "warning",
      title: "Mémoire élevée",
      description: `L'utilisation mémoire est à ${metrics.system.memory}%.`,
      impact: "Risque de dégradation des performances",
      recommendation: "Surveiller l'évolution et vérifier les processus consommateurs.",
      cliCommands: ["show system resources", "show session info"],
      detectedAt: new Date().toISOString(),
      source: "live",
    });
  }

  // Disk élevé
  if (metrics.system.disk > 90) {
    issues.push({
      id: `system-disk-critical-${Date.now()}`,
      category: "system",
      severity: "critical",
      title: "Espace disque critique",
      description: `L'espace disque est utilisé à ${metrics.system.disk}%.`,
      impact: "Risque de perte de logs, impossibilité de faire des commits, système instable",
      recommendation:
        "1. Nettoyer les anciens logs avec 'debug software disk-usage delete'\n2. Vérifier l'espace avec 'show system disk-space'\n3. Archiver ou supprimer les anciennes configurations\n4. Contacter le TAC si le problème persiste",
      cliCommands: [
        "show system disk-space",
        "debug software disk-usage show",
        "debug software disk-usage delete",
      ],
      detectedAt: new Date().toISOString(),
      source: "live",
    });
  }

  return issues;
}

/**
 * Analyse les interfaces réseau (détecte uniquement les problèmes ACTIFS)
 */
function analyzeNetworkInterfaces(interfaces: InterfaceStats[]): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];
  const now = Date.now();

  interfaces.forEach((iface) => {
    const ifaceName = iface.name.split(" (")[0]; // Enlever le commentaire
    const previousCounters = diagnosticInterfaceCache.get(ifaceName);

    // Interface DOWN (toujours pertinent)
    if (iface.status === "down") {
      issues.push({
        id: `network-interface-down-${ifaceName}-${Date.now()}`,
        category: "network",
        severity: "critical",
        title: `Interface ${ifaceName} DOWN`,
        description: `L'interface ${iface.name} est actuellement DOWN.`,
        impact: "Perte de connectivité sur cette interface",
        recommendation:
          "1. Vérifier le câble physique\n2. Vérifier la configuration de l'interface\n3. Vérifier l'état du port distant\n4. Consulter les logs pour des erreurs",
        cliCommands: [
          `show interface ${ifaceName}`,
          `show counter interface ${ifaceName}`,
          `show log system direction equal backward`,
        ],
        affectedComponents: [ifaceName],
        detectedAt: new Date().toISOString(),
        source: "live",
      });
    }

    // Analyser uniquement si les erreurs AUGMENTENT (problème actif)
    if (previousCounters) {
      const rxErrorsDelta = iface.rxErrors - previousCounters.rxErrors;
      const txErrorsDelta = iface.txErrors - previousCounters.txErrors;
      const totalErrorsDelta = rxErrorsDelta + txErrorsDelta;

      if (totalErrorsDelta > 0) {
        const timeDiffSec = (now - previousCounters.timestamp) / 1000;
        const errorsPerSec = totalErrorsDelta / timeDiffSec;

        issues.push({
          id: `network-errors-active-${ifaceName}-${Date.now()}`,
          category: "network",
          severity: errorsPerSec > 1 ? "critical" : "major",
          title: `Erreurs ACTIVES sur ${ifaceName}`,
          description: `${totalErrorsDelta} nouvelles erreurs (${errorsPerSec.toFixed(1)}/s) - RX: ${rxErrorsDelta}, TX: ${txErrorsDelta}`,
          impact: "Perte de paquets ACTIVE, dégradation des performances, problèmes de connectivité",
          recommendation:
            "⚠️ PROBLÈME ACTIF DÉTECTÉ\n1. Vérifier IMMÉDIATEMENT la qualité du câble\n2. Vérifier les paramètres duplex/speed (auto-negotiation)\n3. Vérifier les CRC errors avec 'show counter interface'\n4. Remplacer le câble si nécessaire",
          cliCommands: [
            `show counter interface ${ifaceName}`,
            `show interface ${ifaceName}`,
            `debug dataplane packet-diag set filter match ingress-interface ${ifaceName}`,
          ],
          affectedComponents: [ifaceName],
          detectedAt: new Date().toISOString(),
          source: "live",
        });
      }

      // Analyser uniquement si les drops AUGMENTENT (problème actif)
      const rxDropsDelta = iface.rxDrops - previousCounters.rxDrops;
      const txDropsDelta = iface.txDrops - previousCounters.txDrops;
      const totalDropsDelta = rxDropsDelta + txDropsDelta;

      if (totalDropsDelta > 0) {
        const timeDiffSec = (now - previousCounters.timestamp) / 1000;
        const dropsPerSec = totalDropsDelta / timeDiffSec;

        issues.push({
          id: `network-drops-active-${ifaceName}-${Date.now()}`,
          category: "network",
          severity: dropsPerSec > 100 ? "critical" : "major",
          title: `Drops ACTIFS sur ${ifaceName}`,
          description: `${totalDropsDelta} nouveaux drops (${dropsPerSec.toFixed(1)}/s) - RX: ${rxDropsDelta}, TX: ${txDropsDelta}`,
          impact: "Perte de paquets ACTIVE, connexions interrompues, performances dégradées",
          recommendation:
            "⚠️ PROBLÈME ACTIF DÉTECTÉ\n1. Vérifier IMMÉDIATEMENT la bande passante disponible\n2. Vérifier les queues et buffers\n3. Vérifier les politiques QoS\n4. Augmenter la bande passante si nécessaire",
          cliCommands: [
            `show counter global filter packet-filter yes delta yes`,
            `show interface ${ifaceName}`,
            `show qos interface ${ifaceName}`,
          ],
          affectedComponents: [ifaceName],
          detectedAt: new Date().toISOString(),
          source: "live",
        });
      }
    }

    // Mettre à jour le cache
    diagnosticInterfaceCache.set(ifaceName, {
      rxErrors: iface.rxErrors,
      txErrors: iface.txErrors,
      rxDrops: iface.rxDrops,
      txDrops: iface.txDrops,
      timestamp: now,
    });

    // Utilisation élevée
    if (iface.utilization && iface.utilization > 95) {
      issues.push({
        id: `network-util-critical-${ifaceName}-${Date.now()}`,
        category: "performance",
        severity: "critical",
        title: `Saturation de ${ifaceName}`,
        description: `L'interface est saturée à ${iface.utilization}%`,
        impact: "Congestion réseau, latence élevée, perte de paquets",
        recommendation:
          "1. Ajouter de la bande passante (upgrade du lien)\n2. Optimiser le trafic (QoS, traffic shaping)\n3. Vérifier s'il y a une attaque DDoS\n4. Considérer l'ajout d'une interface en agrégation",
        cliCommands: [
          `show interface ${ifaceName}`,
          `show counter global filter packet-filter yes`,
        ],
        affectedComponents: [ifaceName],
        detectedAt: new Date().toISOString(),
        source: "live",
      });
    } else if (iface.utilization && iface.utilization > 85) {
      issues.push({
        id: `network-util-warning-${ifaceName}-${Date.now()}`,
        category: "performance",
        severity: "warning",
        title: `Utilisation élevée sur ${ifaceName}`,
        description: `L'interface est utilisée à ${iface.utilization}%`,
        impact: "Risque de congestion si le trafic augmente",
        recommendation: "Surveiller l'évolution et planifier une augmentation de bande passante.",
        cliCommands: [`show interface ${ifaceName}`],
        affectedComponents: [ifaceName],
        detectedAt: new Date().toISOString(),
        source: "live",
      });
    }
  });

  return issues;
}

/**
 * Analyse les sessions
 */
function analyzeSessions(sessions: { total: number; active: number }): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];

  // Calculer le pourcentage d'utilisation
  const utilization = (sessions.active / sessions.total) * 100;

  if (utilization > 95) {
    issues.push({
      id: `sessions-critical-${Date.now()}`,
      category: "performance",
      severity: "critical",
      title: "Table de sessions saturée",
      description: `${sessions.active.toLocaleString()} sessions actives sur ${sessions.total.toLocaleString()} (${utilization.toFixed(1)}%)`,
      impact: "Nouvelles connexions refusées, service interrompu",
      recommendation:
        "1. Augmenter la limite de sessions dans la license\n2. Réduire les timeouts de session\n3. Vérifier s'il y a une attaque (scan, DDoS)\n4. Nettoyer les sessions orphelines avec 'clear session all'",
      cliCommands: [
        "show session info",
        "show session meter",
        "clear session all filter source <suspicious-ip>",
      ],
      detectedAt: new Date().toISOString(),
      source: "live",
    });
  } else if (utilization > 85) {
    issues.push({
      id: `sessions-warning-${Date.now()}`,
      category: "performance",
      severity: "warning",
      title: "Table de sessions élevée",
      description: `${sessions.active.toLocaleString()} sessions actives sur ${sessions.total.toLocaleString()} (${utilization.toFixed(1)}%)`,
      impact: "Risque de saturation si le trafic augmente",
      recommendation: "Surveiller l'évolution et planifier une augmentation de la capacité.",
      cliCommands: ["show session info", "show session meter"],
      detectedAt: new Date().toISOString(),
      source: "live",
    });
  }

  return issues;
}

/**
 * Analyse les données TSF
 */
function analyzeTSFData(tsfData: TSFData): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];

  // Logs critiques
  if (tsfData.logs.critical.length > 0) {
    issues.push({
      id: `tsf-logs-critical-${Date.now()}`,
      category: "system",
      severity: "critical",
      title: "Logs critiques détectés",
      description: `${tsfData.logs.critical.length} entrées critiques trouvées dans les logs`,
      impact: "Problèmes système graves nécessitant une attention immédiate",
      recommendation:
        "Analyser les logs critiques pour identifier la cause racine et appliquer les corrections nécessaires.",
      cliCommands: ["show log system severity equal critical", "show log system"],
      detectedAt: new Date().toISOString(),
      source: "tsf",
    });
  }

  // Erreurs dans les logs
  if (tsfData.logs.errors.length > 10) {
    issues.push({
      id: `tsf-logs-errors-${Date.now()}`,
      category: "system",
      severity: tsfData.logs.errors.length > 50 ? "major" : "warning",
      title: "Erreurs dans les logs",
      description: `${tsfData.logs.errors.length} erreurs trouvées dans les logs`,
      impact: "Problèmes potentiels affectant le fonctionnement du firewall",
      recommendation: "Analyser les erreurs pour identifier les problèmes récurrents.",
      cliCommands: ["show log system severity equal error"],
      detectedAt: new Date().toISOString(),
      source: "tsf",
    });
  }

  // HA non synchronisé
  if (tsfData.ha && tsfData.ha.enabled && tsfData.ha.syncStatus !== "synchronized") {
    issues.push({
      id: `tsf-ha-sync-${Date.now()}`,
      category: "ha",
      severity: "critical",
      title: "HA non synchronisé",
      description: `Le cluster HA n'est pas synchronisé (status: ${tsfData.ha.syncStatus || "unknown"})`,
      impact: "Risque de failover incomplet, configurations non synchronisées",
      recommendation:
        "1. Vérifier la connectivité HA avec 'show high-availability all'\n2. Forcer une synchronisation avec 'request high-availability sync-to-remote running-config'\n3. Vérifier les logs HA\n4. Contacter le TAC si le problème persiste",
      cliCommands: [
        "show high-availability all",
        "show high-availability state",
        "request high-availability sync-to-remote running-config",
      ],
      detectedAt: new Date().toISOString(),
      source: "tsf",
    });
  }

  // Licenses expirées
  const expiredLicenses = tsfData.licenses.filter((lic) => lic.status === "expired");
  if (expiredLicenses.length > 0) {
    issues.push({
      id: `tsf-licenses-expired-${Date.now()}`,
      category: "license",
      severity: "major",
      title: "Licenses expirées",
      description: `${expiredLicenses.length} license(s) expirée(s): ${expiredLicenses
        .map((l) => l.feature)
        .join(", ")}`,
      impact: "Fonctionnalités désactivées, protection réduite",
      recommendation:
        "Renouveler les licenses via le portail support Palo Alto Networks ou contacter votre revendeur.",
      cliCommands: ["show license all", "request license fetch"],
      affectedComponents: expiredLicenses.map((l) => l.feature),
      detectedAt: new Date().toISOString(),
      source: "tsf",
    });
  }

  // Processus consommateurs
  const highCPUProcesses = tsfData.processes.filter((p) => p.cpu > 50);
  if (highCPUProcesses.length > 0) {
    issues.push({
      id: `tsf-high-cpu-processes-${Date.now()}`,
      category: "performance",
      severity: "warning",
      title: "Processus consommateurs de CPU",
      description: `${highCPUProcesses.length} processus avec CPU > 50%: ${highCPUProcesses
        .map((p) => `${p.name} (${p.cpu}%)`)
        .join(", ")}`,
      impact: "Utilisation CPU élevée, risque de dégradation des performances",
      recommendation:
        "Identifier la cause de la consommation CPU élevée et optimiser si possible.",
      cliCommands: ["show running resource-monitor", "show system resources"],
      affectedComponents: highCPUProcesses.map((p) => p.name),
      detectedAt: new Date().toISOString(),
      source: "tsf",
    });
  }

  return issues;
}

/**
 * Trie les problèmes par sévérité
 */
function sortBySeverity(issues: DiagnosticIssue[]): DiagnosticIssue[] {
  const severityOrder = { critical: 0, major: 1, warning: 2, info: 3 };
  return issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

/**
 * Calcule un score de santé global (0-100)
 */
export function calculateHealthScore(issues: DiagnosticIssue[]): number {
  let score = 100;

  issues.forEach((issue) => {
    switch (issue.severity) {
      case "critical":
        score -= 20;
        break;
      case "major":
        score -= 10;
        break;
      case "warning":
        score -= 5;
        break;
      case "info":
        score -= 2;
        break;
    }
  });

  return Math.max(0, score);
}

/**
 * Analyse avancée avec métriques TAC-level
 */
export function analyzeAdvancedMetrics(
  metrics: AdvancedMetrics
): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];

  // Analyse du resource monitor
  issues.push(...analyzeDataplaneCPU(metrics.resourceMonitor));
  
  // Analyse des counters (drops)
  issues.push(...analyzePacketDrops(metrics.counters));
  
  // Analyse HA
  issues.push(...analyzeHAHealth(metrics.ha));
  
  // Analyse VPN
  issues.push(...analyzeVPNTunnels(metrics.vpn));
  
  // Analyse routing
  issues.push(...analyzeRoutingStability(metrics.routing));

  return sortBySeverity(issues);
}

/**
 * Analyse CPU dataplane par core
 */
function analyzeDataplaneCPU(
  resourceMonitor: AdvancedMetrics["resourceMonitor"]
): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];

  // Vérifier chaque core
  resourceMonitor.dataplane.forEach((core) => {
    if (core.usage > 95) {
      issues.push({
        id: `dp-cpu-critical-core${core.core}-${Date.now()}`,
        category: "performance",
        severity: "critical",
        title: `Dataplane CPU Core ${core.core} saturé`,
        description: `Le core ${core.core} du dataplane est à ${core.usage.toFixed(1)}%`,
        impact: "Perte de paquets, latence élevée, dégradation des performances",
        recommendation:
          "1. Identifier les fonctions consommatrices avec 'debug dataplane pow performance'\n2. Vérifier les règles de sécurité complexes\n3. Activer hardware offload si disponible\n4. Considérer un upgrade hardware",
        cliCommands: [
          "show running resource-monitor minute",
          "debug dataplane pow performance",
          "show counter global filter packet-filter yes",
        ],
        affectedComponents: [`DP Core ${core.core}`],
        detectedAt: new Date().toISOString(),
        source: "live",
      });
    } else if (core.usage > 85) {
      issues.push({
        id: `dp-cpu-warning-core${core.core}-${Date.now()}`,
        category: "performance",
        severity: "warning",
        title: `Dataplane CPU Core ${core.core} élevé`,
        description: `Le core ${core.core} du dataplane est à ${core.usage.toFixed(1)}%`,
        impact: "Risque de saturation si le trafic augmente",
        recommendation: "Surveiller l'évolution et planifier une optimisation",
        cliCommands: ["show running resource-monitor minute"],
        affectedComponents: [`DP Core ${core.core}`],
        detectedAt: new Date().toISOString(),
        source: "live",
      });
    }
  });

  // Vérifier les buffers
  if (resourceMonitor.packetDescriptor > 90) {
    issues.push({
      id: `packet-descriptor-critical-${Date.now()}`,
      category: "performance",
      severity: "critical",
      title: "Packet descriptors saturés",
      description: `Utilisation des packet descriptors à ${resourceMonitor.packetDescriptor.toFixed(1)}%`,
      impact: "Perte de paquets imminente",
      recommendation:
        "Réduire le trafic, activer QoS, ou augmenter la capacité hardware",
      cliCommands: ["show running resource-monitor minute"],
      detectedAt: new Date().toISOString(),
      source: "live",
    });
  }

  if (resourceMonitor.sessionUtilization > 90) {
    issues.push({
      id: `session-util-critical-${Date.now()}`,
      category: "performance",
      severity: "critical",
      title: "Utilisation sessions critique",
      description: `Utilisation des sessions à ${resourceMonitor.sessionUtilization.toFixed(1)}%`,
      impact: "Nouvelles connexions refusées",
      recommendation: "Augmenter la licence, réduire les timeouts, nettoyer les sessions",
      cliCommands: ["show session info", "clear session all filter age-out yes"],
      detectedAt: new Date().toISOString(),
      source: "live",
    });
  }

  return issues;
}

/**
 * Analyse les packet drops par raison
 */
function analyzePacketDrops(
  counters: AdvancedMetrics["counters"]
): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];

  // Analyser les drops les plus fréquents
  const topDrops = counters.drops.slice(0, 5);

  topDrops.forEach((drop) => {
    if (drop.count > 10000) {
      const severity = drop.count > 100000 ? "critical" : "major";
      
      let recommendation = "Analyser la cause des drops";
      if (drop.name.includes("policy") || drop.reason.includes("policy")) {
        recommendation = "Vérifier les règles de sécurité, ajouter des règles allow si nécessaire";
      } else if (drop.name.includes("route") || drop.reason.includes("route")) {
        recommendation = "Vérifier la table de routage, ajouter les routes manquantes";
      } else if (drop.name.includes("zone") || drop.reason.includes("zone")) {
        recommendation = "Vérifier la configuration des zones et interfaces";
      }

      issues.push({
        id: `packet-drop-${drop.name}-${Date.now()}`,
        category: "network",
        severity,
        title: `Drops de paquets: ${drop.name}`,
        description: `${drop.count.toLocaleString()} paquets droppés - ${drop.reason}`,
        impact: "Perte de connectivité, services impactés",
        recommendation,
        cliCommands: [
          "show counter global filter delta yes severity drop",
          "show counter global filter packet-filter yes",
        ],
        detectedAt: new Date().toISOString(),
        source: "live",
      });
    }
  });

  return issues;
}

/**
 * Analyse la santé HA
 */
function analyzeHAHealth(ha: AdvancedMetrics["ha"]): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];

  if (!ha.enabled) {
    return issues;
  }

  // États problématiques du peer
  const problematicStates = [
    "disconnected",
    "non-functional", 
    "suspended",
    "initial",
    "tentative"
  ];

  // Vérifier l'état du peer (ignorer "unknown" qui peut être un problème de parsing)
  if (problematicStates.includes(ha.peerState.toLowerCase())) {
    const severity = ha.peerState === "disconnected" || ha.peerState === "non-functional" 
      ? "critical" 
      : "major";

    issues.push({
      id: `ha-peer-issue-${Date.now()}`,
      category: "ha",
      severity,
      title: `Peer HA dans un état problématique`,
      description: `Le peer HA est dans l'état: ${ha.peerState}`,
      impact: "Redondance compromise, risque de perte de service en cas de panne",
      recommendation:
        "1. Vérifier la connectivité réseau avec le peer\n2. Vérifier les câbles et interfaces HA\n3. Vérifier l'état du firewall peer\n4. Consulter les logs HA pour identifier la cause",
      cliCommands: [
        "show high-availability all",
        "show high-availability state",
        "show log system direction equal backward | match HA",
      ],
      detectedAt: new Date().toISOString(),
      source: "live",
    });
  }

  // Vérifier la synchronisation (ignorer "unknown")
  const syncProblems = ["not-synchronized", "out-of-sync", "failed"];
  if (syncProblems.some(state => ha.syncStatus.toLowerCase().includes(state))) {
    issues.push({
      id: `ha-sync-failed-${Date.now()}`,
      category: "ha",
      severity: "major",
      title: "Synchronisation HA échouée",
      description: `Status de sync: ${ha.syncStatus}`,
      impact: "Configurations différentes entre les peers, failover incomplet possible",
      recommendation:
        "Forcer la synchronisation avec 'request high-availability sync-to-remote running-config'",
      cliCommands: [
        "show high-availability all",
        "request high-availability sync-to-remote running-config",
      ],
      detectedAt: new Date().toISOString(),
      source: "live",
    });
  }

  return issues;
}

/**
 * Analyse les tunnels VPN
 */
function analyzeVPNTunnels(vpn: AdvancedMetrics["vpn"]): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];

  // États normaux pour IKE
  const normalIKEStates = ["established", "up", "connected"];
  
  // Vérifier les tunnels IKE down (ignorer "unknown" qui peut être un problème de parsing)
  const downIKE = vpn.ikeSa.filter((tunnel) => {
    const state = tunnel.state.toLowerCase();
    return state !== "unknown" && !normalIKEStates.includes(state);
  });

  if (downIKE.length > 0) {
    issues.push({
      id: `vpn-ike-down-${Date.now()}`,
      category: "network",
      severity: "major",
      title: `${downIKE.length} tunnel(s) IKE down`,
      description: `Tunnels affectés: ${downIKE.map((t) => `${t.name} (${t.state})`).join(", ")}`,
      impact: "Perte de connectivité VPN, sites distants inaccessibles",
      recommendation:
        "1. Vérifier la connectivité réseau avec les peers\n2. Vérifier les proposals IKE\n3. Vérifier les certificats\n4. Consulter les logs IKE",
      cliCommands: [
        "show vpn ike-sa",
        "show log ikemgr direction equal backward",
        "test vpn ike-sa gateway <name>",
      ],
      affectedComponents: downIKE.map((t) => t.name),
      detectedAt: new Date().toISOString(),
      source: "live",
    });
  }

  return issues;
}

/**
 * Analyse la stabilité du routing
 */
function analyzeRoutingStability(
  routing: AdvancedMetrics["routing"]
): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];

  // Vérifier les peers BGP down
  const downBGP = routing.bgpPeers.filter(
    (peer) => peer.state !== "Established" && peer.state !== "established"
  );

  if (downBGP.length > 0) {
    issues.push({
      id: `bgp-peers-down-${Date.now()}`,
      category: "network",
      severity: "major",
      title: `${downBGP.length} peer(s) BGP down`,
      description: `Peers affectés: ${downBGP.map((p) => p.peer).join(", ")}`,
      impact: "Routes manquantes, perte de connectivité vers certains réseaux",
      recommendation:
        "1. Vérifier la connectivité réseau\n2. Vérifier la configuration BGP\n3. Vérifier les timers BGP\n4. Consulter les logs routing",
      cliCommands: [
        "show routing protocol bgp summary",
        "show routing protocol bgp peer <peer>",
        "show log routing direction equal backward",
      ],
      affectedComponents: downBGP.map((p) => p.peer),
      detectedAt: new Date().toISOString(),
      source: "live",
    });
  }

  return issues;
}

/**
 * Corrélation entre métriques live et TSF
 */
export function correlateMetrics(
  liveMetrics: DashboardMetrics,
  advancedMetrics: AdvancedMetrics,
  tsfData: TSFAnalysisDeep
): CorrelatedIssue[] {
  const issues: CorrelatedIssue[] = [];

  // Analyser les tendances CPU
  if (tsfData.history.cpuTrend.length > 0) {
    const currentCPU = liveMetrics.system.cpu;
    const avgHistorical = 
      tsfData.history.cpuTrend.reduce((sum, t) => sum + t.value, 0) /
      tsfData.history.cpuTrend.length;

    if (currentCPU > avgHistorical * 1.5) {
      issues.push({
        id: `cpu-trend-increasing-${Date.now()}`,
        category: "performance",
        severity: "warning",
        title: "CPU en augmentation par rapport à l'historique",
        description: `CPU actuel: ${currentCPU}%, moyenne historique: ${avgHistorical.toFixed(1)}%`,
        impact: "Charge inhabituelle, possiblement une attaque ou changement de trafic",
        recommendation: "Analyser la cause de l'augmentation, vérifier les logs",
        cliCommands: ["show running resource-monitor", "show log system"],
        detectedAt: new Date().toISOString(),
        source: "combined",
        trend: "increasing",
        tsfContext: "Basé sur l'analyse historique du TSF",
      });
    }
  }

  // Analyser les crashes récurrents
  if (tsfData.crashes.length > 0) {
    const recentCrashes = tsfData.crashes.filter((crash) => {
      const crashTime = new Date(crash.timestamp).getTime();
      const now = Date.now();
      const dayInMs = 24 * 60 * 60 * 1000;
      return now - crashTime < 7 * dayInMs;
    });

    if (recentCrashes.length > 0) {
      issues.push({
        id: `crashes-detected-${Date.now()}`,
        category: "system",
        severity: "critical",
        title: `${recentCrashes.length} crash(es) détecté(s) dans le TSF`,
        description: `Processus affectés: ${recentCrashes.map((c) => c.process).join(", ")}`,
        impact: "Instabilité système, risque de panne",
        recommendation:
          "1. Vérifier la version PAN-OS et appliquer les hotfixes\n2. Contacter le TAC avec le TSF\n3. Planifier une maintenance si récurrent",
        cliCommands: ["show system info", "request support info"],
        detectedAt: new Date().toISOString(),
        source: "combined",
        recurrence: recentCrashes.length,
        tsfContext: `Crashes: ${recentCrashes.map((c) => c.possibleCause).join("; ")}`,
      });
    }
  }

  return issues;
}
