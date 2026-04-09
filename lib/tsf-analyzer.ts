/**
 * TSF Analyzer - Détection automatique de problèmes connus
 * Base de connaissances TAC Palo Alto Networks
 */

import { TSFData, TSFAnalysisDeep } from "@/types";

interface KnownIssue {
  pattern: RegExp;
  issue: string;
  severity: "critical" | "major" | "warning";
  category: "system" | "network" | "ha" | "performance" | "security";
  possibleCause: string;
  recommendation: string;
  kbArticle?: string;
}

/**
 * Base de connaissances des problèmes courants PAN-OS
 */
const KNOWN_ISSUES: KnownIssue[] = [
  // Crashes et panics
  {
    pattern: /pan_task.*segfault/i,
    issue: "Crash du processus pan_task",
    severity: "critical",
    category: "system",
    possibleCause: "Bug logiciel, corruption mémoire, ou incompatibilité",
    recommendation: "Vérifier la version PAN-OS, appliquer les hotfixes, contacter TAC si récurrent",
    kbArticle: "https://knowledgebase.paloaltonetworks.com/KCSArticleDetail?id=kA10g000000ClZbCAK",
  },
  {
    pattern: /kernel.*panic/i,
    issue: "Kernel panic",
    severity: "critical",
    category: "system",
    possibleCause: "Erreur critique du système d'exploitation",
    recommendation: "Analyser les core dumps, vérifier le hardware, contacter TAC immédiatement",
  },
  {
    pattern: /devsrvr.*crash|devsrvr.*core/i,
    issue: "Crash du device server",
    severity: "critical",
    category: "system",
    possibleCause: "Problème de communication avec le hardware ou bug logiciel",
    recommendation: "Vérifier les logs système, redémarrer le service si nécessaire",
  },
  
  // Mémoire
  {
    pattern: /out of memory|oom|memory.*allocation.*failed/i,
    issue: "Épuisement de la mémoire",
    severity: "critical",
    category: "performance",
    possibleCause: "Fuite mémoire, charge excessive, ou dimensionnement insuffisant",
    recommendation: "Identifier les processus consommateurs, réduire la charge, augmenter la RAM",
  },
  {
    pattern: /swap.*full|swap.*critical/i,
    issue: "Swap saturé",
    severity: "major",
    category: "performance",
    possibleCause: "Mémoire physique insuffisante",
    recommendation: "Réduire la charge, augmenter la RAM, vérifier les fuites mémoire",
  },
  
  // HA
  {
    pattern: /HA.*peer.*unreachable|HA.*link.*down/i,
    issue: "Perte de communication HA",
    severity: "critical",
    category: "ha",
    possibleCause: "Problème réseau, câble débranché, ou firewall peer down",
    recommendation: "Vérifier les câbles HA, les interfaces, et la connectivité réseau",
    kbArticle: "https://knowledgebase.paloaltonetworks.com/KCSArticleDetail?id=kA10g000000ClXsCAK",
  },
  {
    pattern: /HA.*split.*brain|HA.*both.*active/i,
    issue: "Split-brain HA détecté",
    severity: "critical",
    category: "ha",
    possibleCause: "Perte de communication HA, les deux firewalls deviennent actifs",
    recommendation: "Arrêter un firewall immédiatement, restaurer la communication HA",
  },
  {
    pattern: /HA.*sync.*failed|HA.*config.*out.*of.*sync/i,
    issue: "Synchronisation HA échouée",
    severity: "major",
    category: "ha",
    possibleCause: "Différences de configuration, problème réseau, ou bug",
    recommendation: "Forcer la synchronisation avec 'request high-availability sync-to-remote running-config'",
  },
  {
    pattern: /HA.*preempt/i,
    issue: "Preemption HA détectée",
    severity: "warning",
    category: "ha",
    possibleCause: "Firewall avec priorité plus élevée reprend le rôle actif",
    recommendation: "Vérifier si le preempt est intentionnel, désactiver si non désiré",
  },
  
  // Dataplane
  {
    pattern: /dataplane.*restart|dp.*restart/i,
    issue: "Redémarrage du dataplane",
    severity: "critical",
    category: "performance",
    possibleCause: "Crash, timeout, ou commande manuelle",
    recommendation: "Analyser les logs pour la cause, vérifier la stabilité",
  },
  {
    pattern: /packet.*buffer.*full|pkt.*buf.*exhausted/i,
    issue: "Buffers de paquets saturés",
    severity: "critical",
    category: "performance",
    possibleCause: "Trafic excessif, attaque DDoS, ou problème de performance",
    recommendation: "Activer QoS, augmenter les buffers, filtrer le trafic malveillant",
  },
  {
    pattern: /session.*table.*full|session.*limit.*reached/i,
    issue: "Table de sessions saturée",
    severity: "critical",
    category: "performance",
    possibleCause: "Trop de connexions simultanées, scan réseau, ou attaque",
    recommendation: "Augmenter la licence, réduire les timeouts, bloquer les sources suspectes",
  },
  
  // Réseau
  {
    pattern: /link.*down|interface.*down/i,
    issue: "Interface réseau down",
    severity: "major",
    category: "network",
    possibleCause: "Câble débranché, port switch down, ou problème hardware",
    recommendation: "Vérifier le câble, le port distant, et l'état de l'interface",
  },
  {
    pattern: /crc.*error|frame.*error/i,
    issue: "Erreurs CRC/Frame détectées",
    severity: "major",
    category: "network",
    possibleCause: "Câble défectueux, problème duplex/speed, ou interférence",
    recommendation: "Remplacer le câble, vérifier l'auto-negotiation, tester avec un autre port",
  },
  {
    pattern: /arp.*timeout|arp.*failed/i,
    issue: "Problème de résolution ARP",
    severity: "warning",
    category: "network",
    possibleCause: "Passerelle inaccessible, VLAN incorrect, ou problème L2",
    recommendation: "Vérifier la connectivité L2, les VLANs, et la table ARP",
  },
  
  // VPN
  {
    pattern: /ike.*negotiation.*failed|ike.*phase.*failed/i,
    issue: "Échec de négociation IKE",
    severity: "major",
    category: "network",
    possibleCause: "Mismatch de configuration, certificat invalide, ou connectivité",
    recommendation: "Vérifier les proposals IKE, les certificats, et la connectivité UDP 500/4500",
  },
  {
    pattern: /ipsec.*sa.*expired|ipsec.*tunnel.*down/i,
    issue: "Tunnel IPSec down",
    severity: "major",
    category: "network",
    possibleCause: "Expiration SA, problème de keepalive, ou perte de connectivité",
    recommendation: "Vérifier les logs IKE, tester la connectivité, forcer le rekey",
  },
  
  // Authentification
  {
    pattern: /ldap.*timeout|ldap.*unreachable/i,
    issue: "Serveur LDAP inaccessible",
    severity: "major",
    category: "security",
    possibleCause: "Serveur LDAP down, problème réseau, ou firewall bloque",
    recommendation: "Vérifier la connectivité, les credentials, et les règles de sécurité",
  },
  {
    pattern: /radius.*timeout|radius.*no.*response/i,
    issue: "Serveur RADIUS ne répond pas",
    severity: "major",
    category: "security",
    possibleCause: "Serveur down, shared secret incorrect, ou timeout",
    recommendation: "Vérifier le serveur RADIUS, le shared secret, et augmenter le timeout",
  },
  
  // Licenses
  {
    pattern: /license.*expired|subscription.*expired/i,
    issue: "License expirée",
    severity: "major",
    category: "system",
    possibleCause: "Fin de période de souscription",
    recommendation: "Renouveler la licence via le portail support",
  },
  {
    pattern: /threat.*database.*update.*failed/i,
    issue: "Échec de mise à jour des signatures",
    severity: "warning",
    category: "security",
    possibleCause: "Problème de connectivité, serveur update inaccessible",
    recommendation: "Vérifier la connectivité Internet, les proxies, et réessayer",
  },
  
  // Disque
  {
    pattern: /disk.*full|filesystem.*full|no.*space.*left/i,
    issue: "Espace disque saturé",
    severity: "critical",
    category: "system",
    possibleCause: "Logs excessifs, core dumps, ou fichiers temporaires",
    recommendation: "Nettoyer les logs avec 'debug software disk-usage delete'",
  },
  {
    pattern: /disk.*error|io.*error.*sda/i,
    issue: "Erreur disque détectée",
    severity: "critical",
    category: "system",
    possibleCause: "Disque défaillant, problème hardware",
    recommendation: "Sauvegarder immédiatement, planifier un RMA hardware",
  },
  
  // Performance
  {
    pattern: /cpu.*overload|cpu.*critical/i,
    issue: "CPU en surcharge",
    severity: "critical",
    category: "performance",
    possibleCause: "Trafic excessif, attaque, ou règles inefficaces",
    recommendation: "Identifier les processus consommateurs, optimiser les règles",
  },
  {
    pattern: /ssl.*decrypt.*overload/i,
    issue: "Surcharge du déchiffrement SSL",
    severity: "major",
    category: "performance",
    possibleCause: "Trop de sessions SSL/TLS à déchiffrer",
    recommendation: "Réduire le scope du SSL decryption, ajouter du hardware",
  },
  
  // Commit
  {
    pattern: /commit.*failed|validation.*failed/i,
    issue: "Échec de commit",
    severity: "warning",
    category: "system",
    possibleCause: "Erreur de configuration, conflit, ou bug",
    recommendation: "Vérifier les messages d'erreur, corriger la configuration",
  },
  {
    pattern: /commit.*timeout/i,
    issue: "Timeout lors du commit",
    severity: "warning",
    category: "system",
    possibleCause: "Configuration trop volumineuse, système surchargé",
    recommendation: "Simplifier la configuration, réduire la charge, réessayer",
  },
  
  // GlobalProtect
  {
    pattern: /globalprotect.*portal.*unreachable/i,
    issue: "Portail GlobalProtect inaccessible",
    severity: "major",
    category: "network",
    possibleCause: "Service down, certificat invalide, ou problème réseau",
    recommendation: "Vérifier le service, le certificat SSL, et la connectivité",
  },
  {
    pattern: /globalprotect.*authentication.*failed/i,
    issue: "Échec d'authentification GlobalProtect",
    severity: "warning",
    category: "security",
    possibleCause: "Credentials incorrects, serveur auth down",
    recommendation: "Vérifier les credentials, le serveur d'authentification",
  },
  
  // Routing
  {
    pattern: /bgp.*peer.*down|bgp.*neighbor.*down/i,
    issue: "Peer BGP down",
    severity: "major",
    category: "network",
    possibleCause: "Problème de connectivité, mismatch AS, ou timeout",
    recommendation: "Vérifier la connectivité, les timers BGP, et la configuration",
  },
  {
    pattern: /ospf.*neighbor.*down|ospf.*adjacency.*down/i,
    issue: "Voisin OSPF down",
    severity: "major",
    category: "network",
    possibleCause: "Problème de connectivité, mismatch area, ou hello timeout",
    recommendation: "Vérifier la connectivité, les paramètres OSPF, et les timers",
  },
  {
    pattern: /route.*flap|routing.*instability/i,
    issue: "Instabilité du routing",
    severity: "warning",
    category: "network",
    possibleCause: "Problème de connectivité intermittent, boucle de routage",
    recommendation: "Analyser les logs routing, stabiliser la connectivité",
  },
];

/**
 * Analyse un TSF pour détecter les problèmes connus
 */
export function analyzeTSFPatterns(tsfData: TSFData): TSFAnalysisDeep["knownIssues"] {
  const knownIssues: TSFAnalysisDeep["knownIssues"] = [];
  
  // Combiner tous les logs pour l'analyse
  const allLogs = [
    ...tsfData.logs.critical,
    ...tsfData.logs.errors,
    ...tsfData.logs.warnings,
  ].join("\n");
  
  // Tester chaque pattern
  KNOWN_ISSUES.forEach((issue) => {
    const matches: string[] = [];
    
    // Chercher dans les logs
    const logLines = allLogs.split("\n");
    logLines.forEach((line) => {
      if (issue.pattern.test(line)) {
        matches.push(line.trim());
      }
    });
    
    // Si des matches sont trouvés, ajouter à la liste
    if (matches.length > 0) {
      knownIssues.push({
        pattern: issue.issue,
        matches: matches.slice(0, 5), // Limiter à 5 exemples
        kbArticle: issue.kbArticle,
      });
    }
  });
  
  return knownIssues;
}

/**
 * Analyse les crashes pour déterminer la cause probable
 */
export function analyzeCrashes(tsfData: TSFData): TSFAnalysisDeep["crashes"] {
  const crashes: TSFAnalysisDeep["crashes"] = [];
  
  // Analyser les logs critiques pour les crashes
  tsfData.logs.critical.forEach((log) => {
    if (log.includes("CRASH:") || log.includes("segfault") || log.includes("core dump")) {
      // Extraire les informations
      const timestampMatch = log.match(/(\d{4}[-\/]\d{2}[-\/]\d{2}\s+\d{2}:\d{2}:\d{2})/);
      const processMatch = log.match(/(?:CRASH:|Process:)\s*([^\s(]+)/);
      
      let possibleCause = "Cause inconnue";
      
      // Déterminer la cause probable
      if (log.includes("segfault")) {
        possibleCause = "Segmentation fault - accès mémoire invalide";
      } else if (log.includes("out of memory")) {
        possibleCause = "Manque de mémoire disponible";
      } else if (log.includes("assertion")) {
        possibleCause = "Assertion failed - bug logiciel";
      } else if (log.includes("timeout")) {
        possibleCause = "Timeout - processus non réactif";
      }
      
      crashes.push({
        timestamp: timestampMatch ? timestampMatch[1] : "unknown",
        process: processMatch ? processMatch[1] : "unknown",
        backtrace: log,
        possibleCause,
      });
    }
  });
  
  return crashes;
}

/**
 * Extrait les tendances historiques depuis les logs monitor
 */
export function extractHistoricalTrends(tsfData: TSFData): TSFAnalysisDeep["history"] {
  return {
    cpuTrend: [],
    memoryTrend: [],
    sessionTrend: [],
  };
}

/**
 * Analyse la configuration pour détecter les problèmes
 */
export function analyzeConfigIssues(tsfData: TSFData): TSFAnalysisDeep["configIssues"] {
  const issues: TSFAnalysisDeep["configIssues"] = [];
  
  // Vérifier les licenses expirées
  const expiredLicenses = tsfData.licenses.filter((lic) => lic.status === "expired");
  if (expiredLicenses.length > 0) {
    issues.push({
      type: "license",
      description: `${expiredLicenses.length} licence(s) expirée(s)`,
      location: "Licenses",
    });
  }
  
  // Vérifier les interfaces down
  const downInterfaces = tsfData.interfaces.filter((iface) => iface.status === "down");
  if (downInterfaces.length > 0) {
    issues.push({
      type: "network",
      description: `${downInterfaces.length} interface(s) down`,
      location: "Network Interfaces",
    });
  }
  
  return issues;
}

/**
 * Crée une analyse TSF complète avec détection avancée
 */
export function createDeepAnalysis(tsfData: TSFData): TSFAnalysisDeep {
  return {
    ...tsfData,
    crashes: analyzeCrashes(tsfData),
    history: extractHistoricalTrends(tsfData),
    configIssues: analyzeConfigIssues(tsfData),
    knownIssues: analyzeTSFPatterns(tsfData),
  };
}
