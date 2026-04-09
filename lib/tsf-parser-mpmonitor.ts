/**
 * Parser pour mp-monitor.log (Management Plane)
 * Extrait les métriques CPU, Memory, Disk et processus du Management Plane
 */

import type { TSFProcess, TSFHistory, TSFResourcesComplete } from "@/types";

export interface MPMonitorSnapshot {
  timestamp: string;
  cpu: {
    user: number;
    system: number;
    nice: number;
    idle: number;
    wait: number;
    total: number;
  };
  loadAverage: [number, number, number];
  memory: {
    total: number;
    free: number;
    used: number;
    available: number;
    buffers: number;
    cached: number;
    swapTotal: number;
    swapFree: number;
    swapUsed: number;
  };
  disk: {
    mount: string;
    usedPercent: number;
    usedKb: number;
  }[];
  processes: TSFProcess[];
  conntrack: number;
}

export interface MPMonitorData {
  snapshots: MPMonitorSnapshot[];
  latestSnapshot: MPMonitorSnapshot | null;
  cpuHistory: { time: string; value: number }[];
  memoryHistory: { time: string; value: number }[];
  topProcessesByCPU: TSFProcess[];
  topProcessesByMemory: TSFProcess[];
}

/**
 * Parse une section "processes" de mp-monitor.log
 */
function parseProcessesSection(
  content: string,
  timestamp: string
): TSFProcess[] {
  const processes: TSFProcess[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    // Skip header and footer
    if (
      line.includes("Name") ||
      line.includes("Totals") ||
      line.includes("---") ||
      line.trim() === ""
    ) {
      continue;
    }

    // Format: Name  PID  CPU%  FDs Open  Virt Mem  Res+Swap  State  Res+Swap-Lazy
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 7) {
      const name = parts[0];
      const pid = parseInt(parts[1]);
      const cpu = parseFloat(parts[2]);
      const fds = parseInt(parts[3]);
      const virtMem = parseInt(parts[4]);
      const resMem = parseInt(parts[5]);
      const state = parts[6];

      if (!isNaN(pid)) {
        processes.push({
          pid,
          name,
          cpu,
          memory: 0, // Calculé après
          memoryKb: resMem,
          state: state === "R" ? "running" : "sleeping",
          threads: fds,
        });
      }
    }
  }

  return processes;
}

/**
 * Parse une section "memory_detail" de mp-monitor.log
 */
function parseMemoryDetailSection(
  content: string
): Partial<MPMonitorSnapshot["memory"]> {
  const result: Partial<MPMonitorSnapshot["memory"]> = {};

  const patterns: Record<string, keyof MPMonitorSnapshot["memory"]> = {
    MemTotal: "total",
    MemFree: "free",
    MemAvailable: "available",
    Buffers: "buffers",
    Cached: "cached",
    SwapTotal: "swapTotal",
    SwapFree: "swapFree",
  };

  for (const line of content.split("\n")) {
    const match = line.match(/^(\w+):\s*(\d+)\s*kB/);
    if (match) {
      const key = patterns[match[1]];
      if (key) {
        (result as any)[key] = parseInt(match[2]);
      }
    }
  }

  // Calculer used
  if (result.total && result.free) {
    result.used = result.total - result.free;
  }

  // Calculer swapUsed
  if (result.swapTotal !== undefined && result.swapFree !== undefined) {
    result.swapUsed = result.swapTotal - result.swapFree;
  }

  return result;
}

/**
 * Parse une section "filesystem" de mp-monitor.log
 */
function parseFilesystemSection(
  content: string
): MPMonitorSnapshot["disk"] {
  const disks: MPMonitorSnapshot["disk"] = [];

  for (const line of content.split("\n")) {
    // Format: Mount            Used (%)   Used (kB)
    // /                29         10806480
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 3 && parts[0].startsWith("/")) {
      const mount = parts[0];
      const usedPercent = parseInt(parts[1]);
      const usedKb = parseInt(parts[2]);

      if (!isNaN(usedPercent)) {
        disks.push({ mount, usedPercent, usedKb });
      }
    }
  }

  return disks;
}

/**
 * Parse une section "top_summary" de mp-monitor.log
 */
function parseTopSummarySection(
  content: string
): Partial<MPMonitorSnapshot> {
  const result: Partial<MPMonitorSnapshot> = {};

  for (const line of content.split("\n")) {
    // Load average
    const loadMatch = line.match(
      /load average:\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)/
    );
    if (loadMatch) {
      result.loadAverage = [
        parseFloat(loadMatch[1]),
        parseFloat(loadMatch[2]),
        parseFloat(loadMatch[3]),
      ];
    }

    // CPU line
    // %Cpu(s):  1.3 us,  0.7 sy,  0.1 ni, 97.6 id,  0.0 wa,  0.1 hi,  0.1 si,  0.0 st
    const cpuMatch = line.match(
      /%Cpu\(s\):\s*([\d.]+)\s*us,\s*([\d.]+)\s*sy,\s*([\d.]+)\s*ni,\s*([\d.]+)\s*id,\s*([\d.]+)\s*wa/
    );
    if (cpuMatch) {
      result.cpu = {
        user: parseFloat(cpuMatch[1]),
        system: parseFloat(cpuMatch[2]),
        nice: parseFloat(cpuMatch[3]),
        idle: parseFloat(cpuMatch[4]),
        wait: parseFloat(cpuMatch[5]),
        total: Math.round(
          parseFloat(cpuMatch[1]) +
            parseFloat(cpuMatch[2]) +
            parseFloat(cpuMatch[3])
        ),
      };
    }

    // Memory line
    // MiB Mem :  31837.6 total,    251.2 free,   8422.8 used,  23163.6 buff/cache
    const memMatch = line.match(
      /MiB Mem\s*:\s*([\d.]+)\s*total,\s*([\d.]+)\s*free,\s*([\d.]+)\s*used/
    );
    if (memMatch) {
      const totalMb = parseFloat(memMatch[1]);
      const freeMb = parseFloat(memMatch[2]);
      const usedMb = parseFloat(memMatch[3]);

      result.memory = {
        total: Math.round(totalMb * 1024),
        free: Math.round(freeMb * 1024),
        used: Math.round(usedMb * 1024),
        available: 0,
        buffers: 0,
        cached: 0,
        swapTotal: 0,
        swapFree: 0,
        swapUsed: 0,
      };
    }
  }

  return result;
}

/**
 * Parse une section "conntrack" de mp-monitor.log
 */
function parseConntrackSection(content: string): number {
  const match = content.match(/Current nf_conntrack:\s*(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

/**
 * Parse le fichier mp-monitor.log complet
 */
export function parseMPMonitorLog(content: string): MPMonitorData {
  const result: MPMonitorData = {
    snapshots: [],
    latestSnapshot: null,
    cpuHistory: [],
    memoryHistory: [],
    topProcessesByCPU: [],
    topProcessesByMemory: [],
  };

  // Split par sections horodatées
  // Format: 2026-04-04 07:50:50.613 +0200  --- processes
  const sectionRegex =
    /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\.\d+\s+[+-]\d{4}\s+---\s+(\w+)/g;

  const sections: { timestamp: string; type: string; content: string }[] = [];
  let lastIndex = 0;
  let lastTimestamp = "";
  let lastType = "";
  let match;

  while ((match = sectionRegex.exec(content)) !== null) {
    // Sauvegarder la section précédente
    if (lastTimestamp && lastType) {
      sections.push({
        timestamp: lastTimestamp,
        type: lastType,
        content: content.substring(lastIndex, match.index),
      });
    }
    lastTimestamp = match[1];
    lastType = match[2];
    lastIndex = match.index + match[0].length;
  }

  // Dernière section
  if (lastTimestamp && lastType) {
    sections.push({
      timestamp: lastTimestamp,
      type: lastType,
      content: content.substring(lastIndex),
    });
  }

  // Grouper les sections par timestamp (à la minute)
  const snapshotMap = new Map<string, Partial<MPMonitorSnapshot>>();

  for (const section of sections) {
    // Arrondir à la minute
    const minuteTimestamp = section.timestamp.substring(0, 16);
    const existing = snapshotMap.get(minuteTimestamp) || {
      timestamp: minuteTimestamp,
    };

    switch (section.type) {
      case "processes":
        existing.processes = parseProcessesSection(
          section.content,
          section.timestamp
        );
        break;
      case "memory_detail":
        const memData = parseMemoryDetailSection(section.content);
        existing.memory = { ...existing.memory, ...memData } as any;
        break;
      case "filesystem":
        existing.disk = parseFilesystemSection(section.content);
        break;
      case "top_summary":
        const topData = parseTopSummarySection(section.content);
        Object.assign(existing, topData);
        break;
      case "conntrack":
        existing.conntrack = parseConntrackSection(section.content);
        break;
    }

    snapshotMap.set(minuteTimestamp, existing);
  }

  // Convertir en array et trier
  for (const [, snapshot] of snapshotMap) {
    if (snapshot.cpu || snapshot.memory) {
      result.snapshots.push(snapshot as MPMonitorSnapshot);
    }
  }

  result.snapshots.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  // Dernier snapshot
  if (result.snapshots.length > 0) {
    result.latestSnapshot = result.snapshots[result.snapshots.length - 1];
  }

  // Historique CPU et mémoire
  for (const snapshot of result.snapshots) {
    if (snapshot.cpu) {
      result.cpuHistory.push({
        time: snapshot.timestamp,
        value: snapshot.cpu.total,
      });
    }

    if (snapshot.memory && snapshot.memory.total > 0) {
      result.memoryHistory.push({
        time: snapshot.timestamp,
        value: Math.round((snapshot.memory.used / snapshot.memory.total) * 100),
      });
    }
  }

  // Top processus
  if (result.latestSnapshot?.processes) {
    result.topProcessesByCPU = [...result.latestSnapshot.processes]
      .sort((a, b) => b.cpu - a.cpu)
      .slice(0, 10);

    result.topProcessesByMemory = [...result.latestSnapshot.processes]
      .sort((a, b) => b.memoryKb - a.memoryKb)
      .slice(0, 10);
  }

  return result;
}

/**
 * Extraire les ressources Management Plane pour TSFResourcesComplete
 */
export function extractMPResources(
  mpData: MPMonitorData
): Partial<TSFResourcesComplete["management"]> {
  const result: Partial<TSFResourcesComplete["management"]> = {
    cpu: 0,
    memory: 0,
    memoryTotal: 0,
    memoryUsed: 0,
    loadAverage: [0, 0, 0],
    swapUsed: 0,
    swapTotal: 0,
  };

  if (mpData.latestSnapshot) {
    if (mpData.latestSnapshot.cpu) {
      result.cpu = mpData.latestSnapshot.cpu.total;
    }

    if (mpData.latestSnapshot.memory) {
      const mem = mpData.latestSnapshot.memory;
      result.memoryTotal = mem.total;
      result.memoryUsed = mem.used;
      result.memory = Math.round((mem.used / mem.total) * 100);
      result.swapTotal = mem.swapTotal || 0;
      result.swapUsed = mem.swapUsed || 0;
    }

    if (mpData.latestSnapshot.loadAverage) {
      result.loadAverage = mpData.latestSnapshot.loadAverage;
    }
  }

  return result;
}

/**
 * Extraire les processus pour l'affichage
 */
export function extractMPProcesses(mpData: MPMonitorData): TSFProcess[] {
  if (!mpData.latestSnapshot?.processes) {
    return [];
  }
  return mpData.latestSnapshot.processes.slice(0, 30);
}

/**
 * Calculer un résumé des métriques Management Plane
 */
export function getMPSummary(mpData: MPMonitorData): {
  cpuAverage: number;
  cpuMax: number;
  memoryUsagePercent: number;
  loadAverage: [number, number, number];
  diskMostUsed: { mount: string; percent: number } | null;
  topProcess: { name: string; cpu: number } | null;
} {
  const summary = {
    cpuAverage: 0,
    cpuMax: 0,
    memoryUsagePercent: 0,
    loadAverage: [0, 0, 0] as [number, number, number],
    diskMostUsed: null as { mount: string; percent: number } | null,
    topProcess: null as { name: string; cpu: number } | null,
  };

  // CPU stats
  if (mpData.cpuHistory.length > 0) {
    const values = mpData.cpuHistory.map((h) => h.value);
    summary.cpuAverage = Math.round(
      values.reduce((a, b) => a + b, 0) / values.length
    );
    summary.cpuMax = Math.max(...values);
  }

  if (mpData.latestSnapshot) {
    // Memory
    if (mpData.latestSnapshot.memory) {
      const mem = mpData.latestSnapshot.memory;
      summary.memoryUsagePercent = Math.round((mem.used / mem.total) * 100);
    }

    // Load average
    if (mpData.latestSnapshot.loadAverage) {
      summary.loadAverage = mpData.latestSnapshot.loadAverage;
    }

    // Disk le plus utilisé
    if (mpData.latestSnapshot.disk && mpData.latestSnapshot.disk.length > 0) {
      const mostUsed = mpData.latestSnapshot.disk.reduce((max, d) =>
        d.usedPercent > max.usedPercent ? d : max
      );
      summary.diskMostUsed = {
        mount: mostUsed.mount,
        percent: mostUsed.usedPercent,
      };
    }

    // Top process
    if (mpData.topProcessesByCPU.length > 0) {
      const top = mpData.topProcessesByCPU[0];
      summary.topProcess = { name: top.name, cpu: top.cpu };
    }
  }

  return summary;
}

export default parseMPMonitorLog;
