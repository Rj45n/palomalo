/**
 * Parser pour dp-monitor.log (Data Plane)
 * Extrait les métriques CPU par core et par groupe fonctionnel
 */

import type {
  DataPlaneCPUCore,
  DataPlaneCPUGroup,
  TSFProcess,
  TSFHistory,
} from "@/types";

export interface DPMonitorSnapshot {
  timestamp: string;
  cpuTotal: number;
  loadAverage: [number, number, number];
  memoryUsed: number;
  memoryTotal: number;
  cpuByGroup: DataPlaneCPUGroup[];
  cpuByCore: DataPlaneCPUCore[];
  processes: TSFProcess[];
}

export interface DPMonitorData {
  snapshots: DPMonitorSnapshot[];
  latestSnapshot: DPMonitorSnapshot | null;
  cpuHistory: { time: string; value: number }[];
  memoryHistory: { time: string; value: number }[];
  maxCpuByCore: number;
  avgCpuByCore: number;
  hotCores: number[];
}

/**
 * Parse une section "top" de dp-monitor.log
 */
function parseTopSection(
  content: string,
  timestamp: string
): Partial<DPMonitorSnapshot> {
  const result: Partial<DPMonitorSnapshot> = {
    timestamp,
    processes: [],
  };

  const lines = content.split("\n");

  for (const line of lines) {
    // Parse load average
    // top - 06:11:36 up 245 days,  5:48,  0 users,  load average: 39.37, 39.21, 39.22
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

    // Parse CPU line
    // %Cpu(s): 97.8 us,  0.1 sy,  0.1 ni,  1.9 id,  0.0 wa,  0.0 hi,  0.1 si,  0.0 st
    const cpuMatch = line.match(
      /%Cpu\(s\):\s*([\d.]+)\s*us,\s*([\d.]+)\s*sy,\s*([\d.]+)\s*ni,\s*([\d.]+)\s*id/
    );
    if (cpuMatch) {
      const us = parseFloat(cpuMatch[1]);
      const sy = parseFloat(cpuMatch[2]);
      const ni = parseFloat(cpuMatch[3]);
      result.cpuTotal = Math.round(us + sy + ni);
    }

    // Parse Memory line
    // MiB Mem :   3516.7 total,   1359.3 free,    840.3 used,   1317.2 buff/cache
    const memMatch = line.match(
      /MiB Mem\s*:\s*([\d.]+)\s*total,\s*([\d.]+)\s*free,\s*([\d.]+)\s*used/
    );
    if (memMatch) {
      result.memoryTotal = parseFloat(memMatch[1]);
      result.memoryUsed = parseFloat(memMatch[3]);
    }

    // Parse process lines
    // PID USER PR NI VIRT RES SHR S %CPU %MEM TIME+ COMMAND
    const procMatch = line.match(
      /^\s*(\d+)\s+(\w+)\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\w\s+([\d.]+)\s+([\d.]+)\s+[\d:]+\s+(\S+)/
    );
    if (procMatch) {
      const cpu = parseFloat(procMatch[3]);
      if (cpu >= 1) {
        result.processes!.push({
          pid: parseInt(procMatch[1]),
          name: procMatch[5],
          cpu,
          memory: parseFloat(procMatch[4]),
          memoryKb: 0,
          state: "running",
          user: procMatch[2],
        });
      }
    }
  }

  // Trier les processus par CPU décroissant
  if (result.processes) {
    result.processes.sort((a, b) => b.cpu - a.cpu);
    result.processes = result.processes.slice(0, 20);
  }

  return result;
}

/**
 * Parse une section "panio" de dp-monitor.log
 * C'est la section la plus importante pour le Data Plane
 */
function parsePanioSection(
  content: string,
  timestamp: string
): Partial<DPMonitorSnapshot> {
  const result: Partial<DPMonitorSnapshot> = {
    timestamp,
    cpuByGroup: [],
    cpuByCore: [],
  };

  const lines = content.split("\n");
  let parsingGroups = false;
  let parsingCores = false;
  let coreIds: number[] = [];
  let currentCoreOffset = 0;

  for (const line of lines) {
    // Début de la section CPU by group
    if (line.includes("CPU load sampling by group")) {
      parsingGroups = true;
      parsingCores = false;
      continue;
    }

    // Début de la section CPU by core
    if (line.includes("CPU load (%)")) {
      parsingGroups = false;
      parsingCores = true;
      continue;
    }

    // Parse CPU by group
    // :flow_lookup                    :    51%
    if (parsingGroups) {
      const groupMatch = line.match(/:(\w+)\s*:\s*(\d+)%/);
      if (groupMatch) {
        result.cpuByGroup!.push({
          name: groupMatch[1],
          usage: parseInt(groupMatch[2]),
        });
      }
    }

    // Parse CPU by core
    // :core   0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15
    // :       0  43  53  54  52  52  54  52  51  53  52  54  53  53  51  52
    if (parsingCores) {
      // Header line with core IDs
      if (line.includes(":core")) {
        const ids = line
          .replace(":core", "")
          .trim()
          .split(/\s+/)
          .filter((s) => s !== "")
          .map((s) => parseInt(s));
        coreIds = ids;
        currentCoreOffset = 0;
        continue;
      }

      // Data line with values
      if (line.startsWith(":") && !line.includes("core")) {
        const values = line
          .substring(1)
          .trim()
          .split(/\s+/)
          .filter((s) => s !== "")
          .map((s) => parseInt(s));

        // First line after header - these are actual CPU values
        if (values.length > 0 && coreIds.length > 0) {
          for (let i = 0; i < values.length && i < coreIds.length; i++) {
            const existingCore = result.cpuByCore!.find(
              (c) => c.coreId === coreIds[i]
            );
            if (!existingCore) {
              result.cpuByCore!.push({
                coreId: coreIds[i],
                usage: values[i],
              });
            }
          }
          // Reset pour la prochaine ligne de header (cores 16-31)
          coreIds = [];
        }
      }
    }
  }

  return result;
}

/**
 * Parse le fichier dp-monitor.log complet
 */
export function parseDPMonitorLog(content: string): DPMonitorData {
  const result: DPMonitorData = {
    snapshots: [],
    latestSnapshot: null,
    cpuHistory: [],
    memoryHistory: [],
    maxCpuByCore: 0,
    avgCpuByCore: 0,
    hotCores: [],
  };

  // Split par sections horodatées
  // Format: 2026-04-04 06:11:36.989 +0200  --- top
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

  // Grouper les sections par timestamp et combiner top + panio
  const snapshotMap = new Map<string, Partial<DPMonitorSnapshot>>();

  for (const section of sections) {
    const existing = snapshotMap.get(section.timestamp) || {
      timestamp: section.timestamp,
    };

    if (section.type === "top") {
      const topData = parseTopSection(section.content, section.timestamp);
      Object.assign(existing, topData);
    } else if (section.type === "panio") {
      const panioData = parsePanioSection(section.content, section.timestamp);
      Object.assign(existing, panioData);
    }

    snapshotMap.set(section.timestamp, existing);
  }

  // Convertir en array et trier par timestamp
  for (const [, snapshot] of snapshotMap) {
    if (snapshot.cpuByCore && snapshot.cpuByCore.length > 0) {
      result.snapshots.push(snapshot as DPMonitorSnapshot);
    }
  }

  result.snapshots.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  // Dernier snapshot
  if (result.snapshots.length > 0) {
    result.latestSnapshot = result.snapshots[result.snapshots.length - 1];
  }

  // Calculer l'historique CPU
  for (const snapshot of result.snapshots) {
    if (snapshot.cpuByCore && snapshot.cpuByCore.length > 0) {
      // Calculer la moyenne CPU Data Plane (exclure core 0 qui est management)
      const activeCores = snapshot.cpuByCore.filter(
        (c) => c.coreId !== 0 && c.usage > 0
      );
      const avgCpu =
        activeCores.length > 0
          ? Math.round(
              activeCores.reduce((sum, c) => sum + c.usage, 0) /
                activeCores.length
            )
          : 0;

      result.cpuHistory.push({
        time: snapshot.timestamp,
        value: avgCpu,
      });
    }

    if (snapshot.memoryUsed !== undefined && snapshot.memoryTotal !== undefined) {
      result.memoryHistory.push({
        time: snapshot.timestamp,
        value: Math.round((snapshot.memoryUsed / snapshot.memoryTotal) * 100),
      });
    }
  }

  // Calculer les statistiques CPU par core
  if (result.latestSnapshot?.cpuByCore) {
    const activeCores = result.latestSnapshot.cpuByCore.filter(
      (c) => c.coreId !== 0
    );
    if (activeCores.length > 0) {
      result.maxCpuByCore = Math.max(...activeCores.map((c) => c.usage));
      result.avgCpuByCore = Math.round(
        activeCores.reduce((sum, c) => sum + c.usage, 0) / activeCores.length
      );

      // Cores "chauds" (> 80%)
      result.hotCores = activeCores
        .filter((c) => c.usage >= 80)
        .map((c) => c.coreId);
    }
  }

  return result;
}

/**
 * Extraire les processus Data Plane depuis le parsing
 */
export function extractDPProcesses(dpData: DPMonitorData): TSFProcess[] {
  if (!dpData.latestSnapshot?.processes) {
    return [];
  }
  return dpData.latestSnapshot.processes;
}

/**
 * Extraire l'historique CPU pour les graphiques
 */
export function extractCPUHistory(
  dpData: DPMonitorData
): TSFHistory["cpuDataplane"] {
  return dpData.cpuHistory;
}

/**
 * Calculer un résumé des métriques Data Plane
 */
export function getDPSummary(dpData: DPMonitorData): {
  cpuAverage: number;
  cpuMax: number;
  hotCoresCount: number;
  memoryUsagePercent: number;
  loadAverage: [number, number, number];
  panTaskCount: number;
  panTaskAvgCpu: number;
} {
  const summary = {
    cpuAverage: dpData.avgCpuByCore,
    cpuMax: dpData.maxCpuByCore,
    hotCoresCount: dpData.hotCores.length,
    memoryUsagePercent: 0,
    loadAverage: [0, 0, 0] as [number, number, number],
    panTaskCount: 0,
    panTaskAvgCpu: 0,
  };

  if (dpData.latestSnapshot) {
    if (
      dpData.latestSnapshot.memoryUsed !== undefined &&
      dpData.latestSnapshot.memoryTotal !== undefined
    ) {
      summary.memoryUsagePercent = Math.round(
        (dpData.latestSnapshot.memoryUsed /
          dpData.latestSnapshot.memoryTotal) *
          100
      );
    }

    if (dpData.latestSnapshot.loadAverage) {
      summary.loadAverage = dpData.latestSnapshot.loadAverage;
    }

    // Compter les processus pan_task
    if (dpData.latestSnapshot.processes) {
      const panTasks = dpData.latestSnapshot.processes.filter((p) =>
        p.name.includes("pan_task")
      );
      summary.panTaskCount = panTasks.length;
      if (panTasks.length > 0) {
        summary.panTaskAvgCpu = Math.round(
          panTasks.reduce((sum, p) => sum + p.cpu, 0) / panTasks.length
        );
      }
    }
  }

  return summary;
}

export default parseDPMonitorLog;
