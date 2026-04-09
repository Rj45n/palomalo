/**
 * Parser pour les fichiers de logs (show_log_*.txt)
 * Extrait les événements système, VPN, routing, config, alarms
 */

import type { TSFLogEntry } from "@/types";

export interface LogAnalysis {
  systemLogs: TSFLogEntry[];
  configLogs: TSFLogEntry[];
  alarmLogs: TSFLogEntry[];
  globalProtectLogs: TSFLogEntry[];
  statistics: {
    totalEntries: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    errors: number;
    warnings: number;
    critical: number;
  };
  recentEvents: TSFLogEntry[];
  criticalEvents: TSFLogEntry[];
  vpnEvents: TSFLogEntry[];
  routingEvents: TSFLogEntry[];
}

/**
 * Map les sévérités texte vers notre type
 */
function mapSeverity(
  severity: string
): TSFLogEntry["severity"] {
  const s = severity.toLowerCase().trim();
  if (s === "critical" || s === "alert" || s === "emergency") return "critical";
  if (s === "high" || s === "error" || s === "err") return "high";
  if (s === "medium" || s === "warning" || s === "warn") return "medium";
  if (s === "low" || s === "notice") return "low";
  return "informational";
}

/**
 * Parse le fichier show_log_system.txt
 * Format: Time  Severity  Subtype  Object  EventID  ID  Description
 */
export function parseSystemLog(content: string): TSFLogEntry[] {
  const logs: TSFLogEntry[] = [];
  const lines = content.split("\n");
  let dataStarted = false;

  for (const line of lines) {
    // Skip header
    if (line.includes("Time") && line.includes("Severity")) {
      dataStarted = true;
      continue;
    }
    if (line.startsWith("===") || !dataStarted) continue;
    if (line.trim() === "") continue;

    // Format: 2026/04/04 14:21:05 info     general        general 0  Description...
    const match = line.match(
      /^(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})\s+(\w+)\s+(\w+)\s+(\S+)\s+(\S+)\s+(\d+)\s+(.+)$/
    );
    if (match) {
      logs.push({
        timestamp: match[1].replace(/\//g, "-"),
        severity: mapSeverity(match[2]),
        type: match[3],
        subtype: match[5],
        object: match[4],
        eventId: match[6],
        description: match[7].trim(),
      });
    } else {
      // Format alternatif simplifié
      const simpleMatch = line.match(
        /^(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})\s+(\w+)\s+(\w+)\s+(.+)$/
      );
      if (simpleMatch) {
        logs.push({
          timestamp: simpleMatch[1].replace(/\//g, "-"),
          severity: mapSeverity(simpleMatch[2]),
          type: simpleMatch[3],
          description: simpleMatch[4].trim(),
        });
      }
    }
  }

  return logs;
}

/**
 * Parse le fichier show_log_config.txt
 * Format CSV avec colonnes
 */
export function parseConfigLog(content: string): TSFLogEntry[] {
  const logs: TSFLogEntry[] = [];
  const lines = content.split("\n");
  let headers: string[] = [];

  for (const line of lines) {
    if (line.trim() === "") continue;

    // Première ligne = headers
    if (headers.length === 0 && line.includes(",")) {
      headers = line.split(",").map((h) => h.trim().toLowerCase());
      continue;
    }

    if (headers.length === 0) continue;

    // Parse CSV
    const values = parseCSVLine(line);
    if (values.length < 3) continue;

    const entry: Partial<TSFLogEntry> = {
      type: "config",
      severity: "informational",
    };

    // Map les colonnes
    headers.forEach((header, idx) => {
      const value = values[idx]?.trim() || "";
      if (header.includes("time") && value) {
        entry.timestamp = value;
      } else if (header === "description" && value) {
        entry.description = value;
      } else if (header.includes("admin") && value) {
        entry.source = value;
      } else if (header === "type" && value) {
        entry.subtype = value;
      }
    });

    if (entry.timestamp && entry.description) {
      logs.push(entry as TSFLogEntry);
    }
  }

  return logs;
}

/**
 * Parse le fichier show_log_alarm.txt
 * Format CSV
 */
export function parseAlarmLog(content: string): TSFLogEntry[] {
  const logs: TSFLogEntry[] = [];
  const lines = content.split("\n");
  let headers: string[] = [];

  for (const line of lines) {
    if (line.trim() === "") continue;

    // Première ligne = headers
    if (headers.length === 0 && line.includes(",")) {
      headers = line.split(",").map((h) => h.trim().toLowerCase());
      continue;
    }

    if (headers.length === 0) continue;

    // Parse CSV
    const values = parseCSVLine(line);
    if (values.length < 3) continue;

    const entry: Partial<TSFLogEntry> = {
      type: "alarm",
      severity: "high", // Les alarmes sont importantes par défaut
    };

    headers.forEach((header, idx) => {
      const value = values[idx]?.trim() || "";
      if (header.includes("time") && value) {
        entry.timestamp = value;
      } else if (header === "description" && value) {
        entry.description = value;
      } else if (header.includes("type") && value) {
        entry.subtype = value;
      }
    });

    if (entry.timestamp && entry.description) {
      logs.push(entry as TSFLogEntry);
    }
  }

  return logs;
}

/**
 * Parse le fichier show_log_globalprotect.txt
 */
export function parseGlobalProtectLog(content: string): TSFLogEntry[] {
  const logs: TSFLogEntry[] = [];
  const lines = content.split("\n");
  let headers: string[] = [];

  for (const line of lines) {
    if (line.trim() === "") continue;

    // Première ligne = headers
    if (headers.length === 0 && line.includes(",")) {
      headers = line.split(",").map((h) => h.trim().toLowerCase());
      continue;
    }

    if (headers.length === 0) continue;

    // Parse CSV
    const values = parseCSVLine(line);
    if (values.length < 3) continue;

    const entry: Partial<TSFLogEntry> = {
      type: "globalprotect",
      severity: "informational",
    };

    headers.forEach((header, idx) => {
      const value = values[idx]?.trim() || "";
      if (header.includes("time") && value) {
        entry.timestamp = value;
      } else if (header === "description" && value) {
        entry.description = value;
      } else if (header.includes("user") && value) {
        entry.source = value;
      } else if (header.includes("source") && value) {
        entry.source = entry.source ? `${entry.source} (${value})` : value;
      }
    });

    if (entry.timestamp) {
      logs.push(entry as TSFLogEntry);
    }
  }

  return logs;
}

/**
 * Parse une ligne CSV en gérant les guillemets
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);

  return result;
}

/**
 * Analyse tous les logs et retourne un résumé
 */
export function analyzeLogs(logs: {
  system: TSFLogEntry[];
  config: TSFLogEntry[];
  alarm: TSFLogEntry[];
  globalProtect: TSFLogEntry[];
}): LogAnalysis {
  const allLogs = [
    ...logs.system,
    ...logs.config,
    ...logs.alarm,
    ...logs.globalProtect,
  ];

  // Statistiques
  const bySeverity: Record<string, number> = {};
  const byType: Record<string, number> = {};

  for (const log of allLogs) {
    bySeverity[log.severity] = (bySeverity[log.severity] || 0) + 1;
    byType[log.type] = (byType[log.type] || 0) + 1;
  }

  // Filtrer les événements importants
  const criticalEvents = allLogs
    .filter((l) => l.severity === "critical" || l.severity === "high")
    .slice(0, 100);

  const vpnEvents = logs.system
    .filter((l) => l.type === "vpn")
    .slice(0, 100);

  const routingEvents = logs.system
    .filter((l) => l.type === "routing")
    .slice(0, 100);

  // Trier par timestamp décroissant
  allLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return {
    systemLogs: logs.system.slice(0, 500),
    configLogs: logs.config.slice(0, 100),
    alarmLogs: logs.alarm.slice(0, 100),
    globalProtectLogs: logs.globalProtect.slice(0, 200),
    statistics: {
      totalEntries: allLogs.length,
      bySeverity,
      byType,
      errors: (bySeverity["high"] || 0) + (bySeverity["critical"] || 0),
      warnings: bySeverity["medium"] || 0,
      critical: bySeverity["critical"] || 0,
    },
    recentEvents: allLogs.slice(0, 50),
    criticalEvents,
    vpnEvents,
    routingEvents,
  };
}

/**
 * Extraire les patterns d'erreurs récurrentes
 */
export function extractErrorPatterns(
  logs: TSFLogEntry[]
): { pattern: string; count: number; severity: string }[] {
  const patterns: Record<string, { count: number; severity: string }> = {};

  for (const log of logs) {
    if (log.severity === "high" || log.severity === "critical") {
      // Normaliser la description pour regrouper les messages similaires
      let normalized = log.description || "";
      // Remplacer les IPs, timestamps, SPI, etc.
      normalized = normalized.replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, "<IP>");
      normalized = normalized.replace(/0x[0-9A-Fa-f]+/g, "<HEX>");
      normalized = normalized.replace(/\d{4}[-/]\d{2}[-/]\d{2}/g, "<DATE>");
      normalized = normalized.substring(0, 100);

      if (!patterns[normalized]) {
        patterns[normalized] = { count: 0, severity: log.severity };
      }
      patterns[normalized].count++;
    }
  }

  return Object.entries(patterns)
    .map(([pattern, data]) => ({
      pattern,
      count: data.count,
      severity: data.severity,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

/**
 * Extraire les événements VPN importants
 */
export function extractVPNEvents(
  logs: TSFLogEntry[]
): { type: string; count: number; lastSeen: string }[] {
  const events: Record<string, { count: number; lastSeen: string }> = {};

  for (const log of logs) {
    if (log.type !== "vpn") continue;

    let eventType = "unknown";
    const desc = (log.description || "").toLowerCase();

    if (desc.includes("negotiation") && desc.includes("succeeded")) {
      eventType = "ike_success";
    } else if (desc.includes("negotiation") && desc.includes("failed")) {
      eventType = "ike_failed";
    } else if (desc.includes("key installed")) {
      eventType = "sa_installed";
    } else if (desc.includes("key deleted")) {
      eventType = "sa_deleted";
    } else if (desc.includes("lifetime expired")) {
      eventType = "sa_expired";
    } else if (desc.includes("delete message")) {
      eventType = "sa_delete_msg";
    }

    if (!events[eventType]) {
      events[eventType] = { count: 0, lastSeen: "" };
    }
    events[eventType].count++;
    if (!events[eventType].lastSeen || log.timestamp > events[eventType].lastSeen) {
      events[eventType].lastSeen = log.timestamp;
    }
  }

  return Object.entries(events)
    .map(([type, data]) => ({
      type,
      count: data.count,
      lastSeen: data.lastSeen,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Détecter les problèmes potentiels dans les logs
 */
export function detectLogIssues(
  logs: TSFLogEntry[]
): { issue: string; severity: string; count: number; sample: string }[] {
  const issues: {
    issue: string;
    severity: string;
    count: number;
    sample: string;
  }[] = [];

  // Chercher des patterns problématiques
  const problemPatterns = [
    { pattern: /duplicate IP/i, issue: "IP dupliquée (conflit ARP)", severity: "warning" },
    { pattern: /negotiation.*failed/i, issue: "Échec de négociation IKE", severity: "error" },
    { pattern: /certificate.*expired/i, issue: "Certificat expiré", severity: "critical" },
    { pattern: /authentication failed/i, issue: "Échec d'authentification", severity: "error" },
    { pattern: /connection timeout/i, issue: "Timeout de connexion", severity: "warning" },
    { pattern: /memory.*low/i, issue: "Mémoire basse", severity: "critical" },
    { pattern: /disk.*full/i, issue: "Disque plein", severity: "critical" },
    { pattern: /license.*expired/i, issue: "Licence expirée", severity: "critical" },
    { pattern: /high availability.*failed/i, issue: "Échec HA", severity: "critical" },
    { pattern: /peer.*unreachable/i, issue: "Peer HA inaccessible", severity: "error" },
  ];

  for (const { pattern, issue, severity } of problemPatterns) {
    const matching = logs.filter((l) => pattern.test(l.description || ""));
    if (matching.length > 0) {
      issues.push({
        issue,
        severity,
        count: matching.length,
        sample: matching[0].description || "",
      });
    }
  }

  return issues.sort((a, b) => {
    const severityOrder = { critical: 0, error: 1, warning: 2 };
    return (
      (severityOrder[a.severity as keyof typeof severityOrder] || 3) -
      (severityOrder[b.severity as keyof typeof severityOrder] || 3)
    );
  });
}

export default {
  parseSystemLog,
  parseConfigLog,
  parseAlarmLog,
  parseGlobalProtectLog,
  analyzeLogs,
  extractErrorPatterns,
  extractVPNEvents,
  detectLogIssues,
};
