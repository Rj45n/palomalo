/**
 * Détection automatique des problèmes dans les données TSF
 * Analyse les métriques et génère des issues avec recommandations
 */

import type {
  TSFDataComplete,
  TSFIssue,
  TSFCounter,
  TSFInterfaceComplete,
} from "@/types";

export interface DetectionThresholds {
  cpu: {
    dataplaneCritical: number;
    dataplaneWarning: number;
    managementCritical: number;
    managementWarning: number;
    coreHotThreshold: number;
  };
  memory: {
    critical: number;
    warning: number;
  };
  sessions: {
    utilizationCritical: number;
    utilizationWarning: number;
  };
  drops: {
    critical: number;
    warning: number;
    rateThreshold: number;
  };
  interfaces: {
    errorThreshold: number;
    dropThreshold: number;
  };
  disk: {
    critical: number;
    warning: number;
  };
}

const DEFAULT_THRESHOLDS: DetectionThresholds = {
  cpu: {
    dataplaneCritical: 90,
    dataplaneWarning: 75,
    managementCritical: 90,
    managementWarning: 70,
    coreHotThreshold: 95,
  },
  memory: {
    critical: 90,
    warning: 80,
  },
  sessions: {
    utilizationCritical: 85,
    utilizationWarning: 70,
  },
  drops: {
    critical: 10000,
    warning: 1000,
    rateThreshold: 100,
  },
  interfaces: {
    errorThreshold: 1000,
    dropThreshold: 5000,
  },
  disk: {
    critical: 90,
    warning: 80,
  },
};

let issueIdCounter = 0;
function generateIssueId(): string {
  return `tsf-issue-${Date.now()}-${++issueIdCounter}`;
}

/**
 * Détecter les problèmes CPU
 */
function detectCPUIssues(
  data: TSFDataComplete,
  thresholds: DetectionThresholds
): TSFIssue[] {
  const issues: TSFIssue[] = [];

  // CPU Data Plane
  if (data.resources?.dataplane?.cpuAverage) {
    const dpCpu = data.resources.dataplane.cpuAverage;

    if (dpCpu >= thresholds.cpu.dataplaneCritical) {
      issues.push({
        id: generateIssueId(),
        severity: "critical",
        category: "cpu",
        title: "CPU Data Plane critique",
        description: `Le CPU Data Plane est à ${dpCpu}%, au-dessus du seuil critique de ${thresholds.cpu.dataplaneCritical}%.`,
        impact: "Dégradation des performances réseau, latence accrue, risque de drops de paquets",
        recommendation: "Réduire le trafic, vérifier les règles de sécurité gourmandes en ressources, envisager un upgrade matériel",
        evidence: `CPU Data Plane: ${dpCpu}%`,
      });
    } else if (dpCpu >= thresholds.cpu.dataplaneWarning) {
      issues.push({
        id: generateIssueId(),
        severity: "warning",
        category: "cpu",
        title: "CPU Data Plane élevé",
        description: `Le CPU Data Plane est à ${dpCpu}%, au-dessus du seuil d'avertissement de ${thresholds.cpu.dataplaneWarning}%.`,
        impact: "Performances réseau potentiellement affectées pendant les pics de trafic",
        recommendation: "Surveiller l'évolution, identifier les sources de trafic importantes",
        evidence: `CPU Data Plane: ${dpCpu}%`,
      });
    }

    // Vérifier les cores "chauds"
    const hotCores = data.resources.dataplane.cpuByCore?.filter(
      (c) => c.coreId !== 0 && c.usage >= thresholds.cpu.coreHotThreshold
    );
    if (hotCores && hotCores.length > 0) {
      issues.push({
        id: generateIssueId(),
        severity: hotCores.length > 3 ? "major" : "warning",
        category: "cpu",
        title: `${hotCores.length} core(s) Data Plane en surcharge`,
        description: `Les cores suivants sont à ${thresholds.cpu.coreHotThreshold}% ou plus: ${hotCores.map((c) => `Core ${c.coreId} (${c.usage}%)`).join(", ")}`,
        impact: "Ces cores peuvent devenir des goulots d'étranglement",
        recommendation: "Vérifier la répartition du trafic entre les cores, optimiser les rules qui ciblent ces cores",
        evidence: `Cores chauds: ${hotCores.map((c) => c.coreId).join(", ")}`,
      });
    }
  }

  // CPU Management Plane
  if (data.resources?.management?.cpu) {
    const mpCpu = data.resources.management.cpu;

    if (mpCpu >= thresholds.cpu.managementCritical) {
      issues.push({
        id: generateIssueId(),
        severity: "major",
        category: "cpu",
        title: "CPU Management Plane critique",
        description: `Le CPU Management Plane est à ${mpCpu}%, au-dessus du seuil critique de ${thresholds.cpu.managementCritical}%.`,
        impact: "Interface web et SSH peuvent être lents, commits peuvent échouer",
        recommendation: "Vérifier les processus consommateurs (logrcvr, reportd, devsrvr), réduire le logging si nécessaire",
        evidence: `CPU Management Plane: ${mpCpu}%`,
      });
    }
  }

  return issues;
}

/**
 * Détecter les problèmes de mémoire
 */
function detectMemoryIssues(
  data: TSFDataComplete,
  thresholds: DetectionThresholds
): TSFIssue[] {
  const issues: TSFIssue[] = [];

  // Memory Management Plane
  if (data.resources?.management?.memory) {
    const memPercent = data.resources.management.memory;

    if (memPercent >= thresholds.memory.critical) {
      issues.push({
        id: generateIssueId(),
        severity: "critical",
        category: "memory",
        title: "Mémoire Management Plane critique",
        description: `La mémoire est utilisée à ${memPercent}%, au-dessus du seuil critique.`,
        impact: "Risque de crash des processus, instabilité du système",
        recommendation: "Identifier les processus consommateurs, redémarrer les services si nécessaire, libérer les caches",
        evidence: `Mémoire: ${memPercent}%`,
      });
    } else if (memPercent >= thresholds.memory.warning) {
      issues.push({
        id: generateIssueId(),
        severity: "warning",
        category: "memory",
        title: "Mémoire Management Plane élevée",
        description: `La mémoire est utilisée à ${memPercent}%.`,
        impact: "Performances potentiellement réduites pour les opérations de management",
        recommendation: "Surveiller l'évolution, planifier une maintenance si nécessaire",
        evidence: `Mémoire: ${memPercent}%`,
      });
    }
  }

  // Swap utilisé
  if (data.resources?.management?.swapUsed && data.resources.management.swapUsed > 0) {
    issues.push({
      id: generateIssueId(),
      severity: "warning",
      category: "memory",
      title: "Utilisation du swap détectée",
      description: `${Math.round(data.resources.management.swapUsed / 1024)} MB de swap utilisé`,
      impact: "Performances dégradées car le swap est plus lent que la RAM",
      recommendation: "Identifier la cause de la pression mémoire, libérer de la mémoire",
      evidence: `Swap utilisé: ${data.resources.management.swapUsed} KB`,
    });
  }

  return issues;
}

/**
 * Détecter les problèmes de sessions
 */
function detectSessionIssues(
  data: TSFDataComplete,
  thresholds: DetectionThresholds
): TSFIssue[] {
  const issues: TSFIssue[] = [];

  if (data.sessions) {
    const util = data.sessions.utilization;

    if (util >= thresholds.sessions.utilizationCritical) {
      issues.push({
        id: generateIssueId(),
        severity: "critical",
        category: "sessions",
        title: "Table de sessions presque pleine",
        description: `L'utilisation des sessions est à ${util}%, proche de la limite.`,
        impact: "Les nouvelles connexions seront refusées une fois la limite atteinte",
        recommendation: "Réduire les timeouts de sessions, identifier les sources de connexions excessives, augmenter la capacité si possible",
        evidence: `Sessions: ${data.sessions.allocated}/${data.sessions.supported} (${util}%)`,
      });
    } else if (util >= thresholds.sessions.utilizationWarning) {
      issues.push({
        id: generateIssueId(),
        severity: "warning",
        category: "sessions",
        title: "Utilisation des sessions élevée",
        description: `L'utilisation des sessions est à ${util}%.`,
        impact: "Risque de saturation pendant les pics de trafic",
        recommendation: "Surveiller l'évolution, ajuster les timeouts si nécessaire",
        evidence: `Sessions: ${data.sessions.allocated}/${data.sessions.supported} (${util}%)`,
      });
    }
  }

  return issues;
}

/**
 * Détecter les problèmes de drops
 */
function detectDropIssues(
  data: TSFDataComplete,
  thresholds: DetectionThresholds
): TSFIssue[] {
  const issues: TSFIssue[] = [];

  if (data.counters?.drops) {
    // Filtrer les drops significatifs
    const significantDrops = data.counters.drops.filter(
      (d) => d.value >= thresholds.drops.warning || d.rate >= thresholds.drops.rateThreshold
    );

    // Grouper par catégorie
    const criticalDrops = significantDrops.filter(
      (d) => d.value >= thresholds.drops.critical || d.rate >= thresholds.drops.rateThreshold * 10
    );

    if (criticalDrops.length > 0) {
      issues.push({
        id: generateIssueId(),
        severity: "critical",
        category: "drops",
        title: `${criticalDrops.length} compteur(s) de drops critiques`,
        description: `Les compteurs de drops suivants ont des valeurs critiques: ${criticalDrops.slice(0, 5).map((d) => d.name).join(", ")}`,
        impact: "Perte de paquets active, impact sur les services",
        recommendation: "Analyser les compteurs spécifiques, vérifier les politiques de sécurité, examiner les logs",
        evidence: criticalDrops
          .slice(0, 5)
          .map((d) => `${d.name}: ${d.value} (rate: ${d.rate}/s)`)
          .join("\n"),
      });
    }

    // Drops de type policy deny
    const policyDrops = significantDrops.filter(
      (d) => d.name.includes("policy_deny") || d.name.includes("deny")
    );
    if (policyDrops.length > 0) {
      const totalPolicyDrops = policyDrops.reduce((sum, d) => sum + d.value, 0);
      if (totalPolicyDrops > thresholds.drops.warning) {
        issues.push({
          id: generateIssueId(),
          severity: "info",
          category: "drops",
          title: "Drops par politique de sécurité",
          description: `${totalPolicyDrops} paquets ont été bloqués par les règles de sécurité`,
          impact: "Comportement normal si attendu, sinon trafic légitime bloqué",
          recommendation: "Vérifier que les règles correspondent aux besoins métier",
          evidence: policyDrops.map((d) => `${d.name}: ${d.value}`).join("\n"),
        });
      }
    }
  }

  return issues;
}

/**
 * Détecter les problèmes d'interfaces
 */
function detectInterfaceIssues(
  data: TSFDataComplete,
  thresholds: DetectionThresholds
): TSFIssue[] {
  const issues: TSFIssue[] = [];

  if (data.interfaces) {
    // Interfaces down
    const downInterfaces = data.interfaces.filter(
      (i) =>
        i.status === "down" &&
        i.type === "ethernet" &&
        !i.name.includes("ha")
    );
    if (downInterfaces.length > 0) {
      issues.push({
        id: generateIssueId(),
        severity: "warning",
        category: "interfaces",
        title: `${downInterfaces.length} interface(s) down`,
        description: `Les interfaces suivantes sont down: ${downInterfaces.map((i) => i.name).join(", ")}`,
        impact: "Trafic potentiellement impacté si ces interfaces sont utilisées",
        recommendation: "Vérifier les câbles, les ports switch, et la configuration",
        evidence: downInterfaces.map((i) => i.name).join(", "),
      });
    }

    // Interfaces avec erreurs
    const errorInterfaces = data.interfaces.filter(
      (i) =>
        (i.rxErrors + i.txErrors) >= thresholds.interfaces.errorThreshold
    );
    if (errorInterfaces.length > 0) {
      issues.push({
        id: generateIssueId(),
        severity: "warning",
        category: "interfaces",
        title: `${errorInterfaces.length} interface(s) avec erreurs`,
        description: `Les interfaces suivantes ont des erreurs: ${errorInterfaces.map((i) => `${i.name} (${i.rxErrors + i.txErrors} erreurs)`).join(", ")}`,
        impact: "Possible problème de connectivité ou de performance",
        recommendation: "Vérifier le câblage, la négociation duplex/vitesse, remplacer le câble si nécessaire",
        evidence: errorInterfaces
          .map((i) => `${i.name}: RX=${i.rxErrors}, TX=${i.txErrors}`)
          .join("\n"),
      });
    }

    // Interfaces avec drops
    const dropInterfaces = data.interfaces.filter(
      (i) =>
        (i.rxDrops + i.txDrops) >= thresholds.interfaces.dropThreshold
    );
    if (dropInterfaces.length > 0) {
      issues.push({
        id: generateIssueId(),
        severity: "warning",
        category: "interfaces",
        title: `${dropInterfaces.length} interface(s) avec drops`,
        description: `Les interfaces suivantes ont des drops: ${dropInterfaces.map((i) => `${i.name} (${i.rxDrops + i.txDrops} drops)`).join(", ")}`,
        impact: "Perte potentielle de paquets",
        recommendation: "Vérifier la capacité de l'interface, les buffers, et le trafic",
        evidence: dropInterfaces
          .map((i) => `${i.name}: RX=${i.rxDrops}, TX=${i.txDrops}`)
          .join("\n"),
      });
    }
  }

  return issues;
}

/**
 * Détecter les problèmes HA
 */
function detectHAIssues(data: TSFDataComplete): TSFIssue[] {
  const issues: TSFIssue[] = [];

  if (data.ha?.enabled) {
    // Peer down ou déconnecté
    const peerState = data.ha.peerState?.toLowerCase();
    if (
      peerState &&
      (peerState.includes("down") ||
        peerState.includes("disconnected") ||
        peerState.includes("non-func"))
    ) {
      issues.push({
        id: generateIssueId(),
        severity: "critical",
        category: "ha",
        title: "Peer HA non fonctionnel",
        description: `L'état du peer HA est: ${data.ha.peerState}`,
        impact: "Pas de failover automatique en cas de panne du firewall actif",
        recommendation: "Vérifier la connectivité HA1/HA2, l'état du peer, les logs HA",
        evidence: `Local: ${data.ha.localState}, Peer: ${data.ha.peerState}`,
      });
    }

    // Synchronisation non complète
    if (data.ha.configSync && !data.ha.configSync.toLowerCase().includes("complete")) {
      issues.push({
        id: generateIssueId(),
        severity: "major",
        category: "ha",
        title: "Synchronisation HA incomplète",
        description: `État de synchronisation: ${data.ha.configSync}`,
        impact: "La configuration n'est pas synchronisée entre les deux firewalls",
        recommendation: "Forcer une synchronisation, vérifier les différences de configuration",
        evidence: `Sync status: ${data.ha.configSync}`,
      });
    }

    // Liens HA down
    if (data.ha.links?.ha1?.status === "down") {
      issues.push({
        id: generateIssueId(),
        severity: "critical",
        category: "ha",
        title: "Lien HA1 down",
        description: "Le lien de contrôle HA1 est down",
        impact: "Communication de contrôle entre les peers impossible",
        recommendation: "Vérifier le câble HA1, l'interface, et la configuration",
        evidence: `HA1 status: ${data.ha.links.ha1.status}`,
      });
    }
    if (data.ha.links?.ha2?.status === "down") {
      issues.push({
        id: generateIssueId(),
        severity: "critical",
        category: "ha",
        title: "Lien HA2 down",
        description: "Le lien de données HA2 est down",
        impact: "Synchronisation des sessions impossible",
        recommendation: "Vérifier le câble HA2, l'interface, et la configuration",
        evidence: `HA2 status: ${data.ha.links.ha2.status}`,
      });
    }
  }

  return issues;
}

/**
 * Détecter les problèmes VPN
 */
function detectVPNIssues(data: TSFDataComplete): TSFIssue[] {
  const issues: TSFIssue[] = [];

  if (data.vpn?.ikeSa) {
    // IKE SAs down
    const downSAs = data.vpn.ikeSa.filter(
      (sa) =>
        !["established", "up", "connected", "unknown"].includes(
          sa.state.toLowerCase()
        )
    );
    if (downSAs.length > 0) {
      issues.push({
        id: generateIssueId(),
        severity: downSAs.length > 3 ? "major" : "warning",
        category: "vpn",
        title: `${downSAs.length} tunnel(s) IKE non établi(s)`,
        description: `Les tunnels suivants ne sont pas établis: ${downSAs.map((sa) => sa.name).slice(0, 10).join(", ")}`,
        impact: "Trafic VPN non fonctionnel pour ces tunnels",
        recommendation: "Vérifier la configuration IKE, les PSK, la connectivité avec le peer",
        evidence: downSAs
          .slice(0, 5)
          .map((sa) => `${sa.name}: ${sa.state}`)
          .join("\n"),
      });
    }
  }

  return issues;
}

/**
 * Détecter les problèmes de disque
 */
function detectDiskIssues(
  data: TSFDataComplete,
  thresholds: DetectionThresholds
): TSFIssue[] {
  const issues: TSFIssue[] = [];

  if (data.resources?.disk?.partitions) {
    const criticalPartitions = data.resources.disk.partitions.filter(
      (p) => p.usagePercent >= thresholds.disk.critical
    );
    const warningPartitions = data.resources.disk.partitions.filter(
      (p) =>
        p.usagePercent >= thresholds.disk.warning &&
        p.usagePercent < thresholds.disk.critical
    );

    if (criticalPartitions.length > 0) {
      issues.push({
        id: generateIssueId(),
        severity: "critical",
        category: "memory", // Utilise "memory" car pas de catégorie disk
        title: `${criticalPartitions.length} partition(s) de disque critique(s)`,
        description: `Les partitions suivantes sont presque pleines: ${criticalPartitions.map((p) => `${p.mountPoint} (${p.usagePercent}%)`).join(", ")}`,
        impact: "Risque de perte de logs, impossibilité de sauvegarder la configuration",
        recommendation: "Libérer de l'espace, supprimer les anciens logs, augmenter le stockage",
        evidence: criticalPartitions
          .map((p) => `${p.mountPoint}: ${p.usagePercent}%`)
          .join("\n"),
      });
    }

    if (warningPartitions.length > 0) {
      issues.push({
        id: generateIssueId(),
        severity: "warning",
        category: "memory",
        title: `${warningPartitions.length} partition(s) de disque élevée(s)`,
        description: `Les partitions suivantes ont un usage élevé: ${warningPartitions.map((p) => `${p.mountPoint} (${p.usagePercent}%)`).join(", ")}`,
        impact: "Risque de remplissage complet à court terme",
        recommendation: "Planifier un nettoyage, surveiller l'évolution",
        evidence: warningPartitions
          .map((p) => `${p.mountPoint}: ${p.usagePercent}%`)
          .join("\n"),
      });
    }
  }

  return issues;
}

/**
 * Détecter les problèmes de licence
 */
function detectLicenseIssues(data: TSFDataComplete): TSFIssue[] {
  const issues: TSFIssue[] = [];

  if (data.licenses) {
    const expiredLicenses = data.licenses.filter((l) => l.expired);
    const soonExpiring = data.licenses.filter(
      (l) => !l.expired && l.daysRemaining !== undefined && l.daysRemaining <= 30
    );

    if (expiredLicenses.length > 0) {
      issues.push({
        id: generateIssueId(),
        severity: "critical",
        category: "license",
        title: `${expiredLicenses.length} licence(s) expirée(s)`,
        description: `Les licences suivantes sont expirées: ${expiredLicenses.map((l) => l.feature).join(", ")}`,
        impact: "Fonctionnalités non disponibles, mises à jour de contenu impossibles",
        recommendation: "Renouveler les licences auprès de Palo Alto Networks",
        evidence: expiredLicenses.map((l) => `${l.feature}: ${l.expires}`).join("\n"),
      });
    }

    if (soonExpiring.length > 0) {
      issues.push({
        id: generateIssueId(),
        severity: "warning",
        category: "license",
        title: `${soonExpiring.length} licence(s) expirant bientôt`,
        description: `Les licences suivantes expirent dans les 30 prochains jours: ${soonExpiring.map((l) => l.feature).join(", ")}`,
        impact: "Fonctionnalités bientôt non disponibles",
        recommendation: "Planifier le renouvellement des licences",
        evidence: soonExpiring
          .map((l) => `${l.feature}: ${l.expires} (${l.daysRemaining} jours)`)
          .join("\n"),
      });
    }
  }

  return issues;
}

/**
 * Fonction principale de détection des issues
 */
export function detectAllIssues(
  data: TSFDataComplete,
  thresholds: DetectionThresholds = DEFAULT_THRESHOLDS
): TSFIssue[] {
  const issues: TSFIssue[] = [];

  // Détecter toutes les catégories de problèmes
  issues.push(...detectCPUIssues(data, thresholds));
  issues.push(...detectMemoryIssues(data, thresholds));
  issues.push(...detectSessionIssues(data, thresholds));
  issues.push(...detectDropIssues(data, thresholds));
  issues.push(...detectInterfaceIssues(data, thresholds));
  issues.push(...detectHAIssues(data));
  issues.push(...detectVPNIssues(data));
  issues.push(...detectDiskIssues(data, thresholds));
  issues.push(...detectLicenseIssues(data));

  // Trier par sévérité
  const severityOrder = { critical: 0, major: 1, warning: 2, info: 3 };
  issues.sort(
    (a, b) =>
      (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4)
  );

  return issues;
}

/**
 * Calculer le health score basé sur les issues
 */
export function calculateHealthScore(issues: TSFIssue[]): number {
  let score = 100;

  for (const issue of issues) {
    switch (issue.severity) {
      case "critical":
        score -= 25;
        break;
      case "major":
        score -= 15;
        break;
      case "warning":
        score -= 5;
        break;
      case "info":
        score -= 1;
        break;
    }
  }

  return Math.max(0, Math.min(100, score));
}

export default detectAllIssues;
