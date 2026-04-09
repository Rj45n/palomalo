/**
 * API pour le diagnostic TAC-level en temps réel
 * Exécute toutes les commandes nécessaires pour un diagnostic complet
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  executeCommand,
  getResourceMonitor,
  getResourceMonitorHour,
  getResourceMonitorIngress,
  getSessionStats,
} from "@/lib/panos";

export async function GET() {
  try {
    const cookieStore = await cookies();

    // Support des deux formats de cookies (panos_session legacy + panos_api_key/panos_url standard)
    let url: string | undefined;
    let apiKey: string | undefined;

    const sessionCookie = cookieStore.get("panos_session");
    if (sessionCookie) {
      try {
        const parsed = JSON.parse(sessionCookie.value);
        url = parsed.url;
        apiKey = parsed.apiKey;
      } catch { /* ignore */ }
    }

    if (!url || !apiKey) {
      url = cookieStore.get("panos_url")?.value;
      apiKey = cookieStore.get("panos_api_key")?.value;
    }

    if (!url || !apiKey) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    console.log("🔍 Démarrage du diagnostic TAC-level complet...");

    // Exécuter toutes les commandes en parallèle
    const [
      systemResources,
      sessionInfo,
      sessionMeter,
      resourceMonitor,
      resourceMonitorHour,
      resourceMonitorIngress,
      counterDelta,
      sessionStats,
      haState,
      routingSummary,
      vpnIke,
      vpnIpsec,
      globalProtect,
      systemInfo,
    ] = await Promise.allSettled([
      executeCommand(url, apiKey, "show system resources"),
      executeCommand(url, apiKey, "show session info"),
      executeCommand(url, apiKey, "show session meter"),
      getResourceMonitor(url, apiKey),                          // CPU DP minute (60s)
      getResourceMonitorHour(url, apiKey),                      // CPU DP heure (60min)
      getResourceMonitorIngress(url, apiKey),                   // Backlogs ingress
      executeCommand(url, apiKey, "show counter global filter delta yes"),
      getSessionStats(url, apiKey),                             // Stats sessions étendues
      executeCommand(url, apiKey, "show high-availability state"),
      executeCommand(url, apiKey, "show routing summary"),
      executeCommand(url, apiKey, "show vpn ike-sa"),
      executeCommand(url, apiKey, "show vpn ipsec-sa"),
      executeCommand(url, apiKey, "show global-protect-gateway current-user"),
      executeCommand(url, apiKey, "show system info"),
    ]);

    // Parser les résultats
    const mpData = parseSystemResources(getResult(systemResources));
    const dpMinute = parseResourceMonitor(getResult(resourceMonitor));
    const dpHour = parseResourceMonitorHour(getResult(resourceMonitorHour));
    const dpIngress = parseIngressBacklogs(getResult(resourceMonitorIngress));

    const diagnostic = {
      timestamp: new Date().toISOString(),
      
      // Management Plane CPU + mémoire + processus
      managementPlane: mpData,
      
      // Data Plane CPU (minute = valeurs actuelles, heure = tendance)
      dataPlane: dpMinute,
      
      // Tendance CPU sur 1 heure
      cpuHistory: dpHour,
      
      // Backlogs ingress (cores saturés)
      ingressBacklogs: dpIngress,
      
      // Sessions
      sessions: parseSessionInfo(getResult(sessionInfo)),
      sessionMeter: parseSessionMeter(getResult(sessionMeter)),
      sessionStats: parseSessionStats(getResult(sessionStats)),
      
      // Counters (drops, errors)
      counters: parseCounters(getResult(counterDelta)),
      
      // HA
      ha: parseHA(getResult(haState)),
      
      // Routing
      routing: parseRouting(getResult(routingSummary)),
      
      // VPN
      vpn: {
        ike: parseVPNIke(getResult(vpnIke)),
        ipsec: parseVPNIpsec(getResult(vpnIpsec)),
      },
      
      // GlobalProtect
      globalProtect: parseGlobalProtect(getResult(globalProtect)),
      
      // System Info
      system: parseSystemInfo(getResult(systemInfo)),
    };

    // Analyser et détecter les problèmes
    const issues = analyzeAndDetectIssues(diagnostic);

    console.log(`✅ Diagnostic terminé: ${issues.length} problèmes détectés`);

    return NextResponse.json({
      ...diagnostic,
      issues,
      healthScore: calculateHealthScore(issues),
    });
  } catch (error) {
    console.error("❌ Erreur diagnostic:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur diagnostic" },
      { status: 500 }
    );
  }
}

function getResult(settled: PromiseSettledResult<any>): any {
  return settled.status === "fulfilled" ? settled.value : null;
}

function parseSystemResources(xml: any): any {
  if (!xml?.response?.result) return null;
  
  const result = xml.response.result;
  if (typeof result !== "string") return null;
  
  const cpuMatch = result.match(/%Cpu\(s\):\s*(\d+\.?\d*)\s*us,\s*(\d+\.?\d*)\s*sy,\s*(\d+\.?\d*)\s*ni,\s*(\d+\.?\d*)\s*id/);
  const memMatch = result.match(/MiB Mem\s*:\s*(\d+\.?\d*)\s*total,\s*(\d+\.?\d*)\s*free,\s*(\d+\.?\d*)\s*used/);
  const loadMatch = result.match(/load average:\s*(\d+\.?\d*),\s*(\d+\.?\d*),\s*(\d+\.?\d*)/);

  // Extraire les processus top (lignes après l'en-tête PID USER PR...)
  // Format: PID USER PR NI VIRT RES SHR S %CPU %MEM TIME+ COMMAND
  const processes: { pid: number; name: string; cpu: number; mem: number; state: string }[] = [];
  const procLines = result.split("\n");
  let inProcSection = false;
  for (const line of procLines) {
    if (line.includes("PID") && line.includes("CPU") && line.includes("COMMAND")) {
      inProcSection = true;
      continue;
    }
    if (inProcSection) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 12) {
        const cpu = parseFloat(parts[8]) || 0;
        if (cpu > 0) {
          processes.push({
            pid: parseInt(parts[0], 10),
            name: parts[11] || "unknown",
            cpu,
            mem: parseFloat(parts[9]) || 0,
            state: parts[7] || "?",
          });
        }
      }
    }
  }
  // Trier par CPU décroissant, garder top 10
  processes.sort((a, b) => b.cpu - a.cpu);

  return {
    cpu: {
      user: cpuMatch ? parseFloat(cpuMatch[1]) : 0,
      system: cpuMatch ? parseFloat(cpuMatch[2]) : 0,
      nice: cpuMatch ? parseFloat(cpuMatch[3]) : 0,
      idle: cpuMatch ? parseFloat(cpuMatch[4]) : 0,
      total: cpuMatch ? parseFloat(cpuMatch[1]) + parseFloat(cpuMatch[2]) + parseFloat(cpuMatch[3]) : 0,
    },
    memory: {
      totalMB: memMatch ? parseFloat(memMatch[1]) : 0,
      freeMB: memMatch ? parseFloat(memMatch[2]) : 0,
      usedMB: memMatch ? parseFloat(memMatch[3]) : 0,
      percentUsed: memMatch ? Math.round((parseFloat(memMatch[3]) / parseFloat(memMatch[1])) * 100) : 0,
    },
    loadAverage: {
      "1min": loadMatch ? parseFloat(loadMatch[1]) : 0,
      "5min": loadMatch ? parseFloat(loadMatch[2]) : 0,
      "15min": loadMatch ? parseFloat(loadMatch[3]) : 0,
    },
    topProcesses: processes.slice(0, 10),
  };
}

function parseResourceMonitor(xml: any): any {
  if (!xml?.response?.result?.["resource-monitor"]) return null;
  
  const rm = xml.response.result["resource-monitor"];
  const dp = rm["data-processors"];
  
  if (!dp) return null;
  
  const cores: { core: number; current: number; avg: number }[] = [];
  // CPU par groupe fonctionnel (flow_lookup, flow_fastpath, decryption, app-id, content-id…)
  const groups: { name: string; current: number; avg: number }[] = [];
  
  // Processus DP : pan_task, pan_comm, pan_hdl, etc. par core
  const dpProcesses: { name: string; core: number; cpu: number; avg: number }[] = [];

  for (const dpName of Object.keys(dp)) {
    const minute = dp[dpName]?.minute;
    
    // CPU par core
    const cpuLoadAvg = minute?.["cpu-load-average"];
    if (cpuLoadAvg?.entry) {
      const entries = Array.isArray(cpuLoadAvg.entry) ? cpuLoadAvg.entry : [cpuLoadAvg.entry];
      for (const entry of entries) {
        const coreId = parseInt(entry.coreid, 10);
        const values = String(entry.value).split(",").map((v: string) => parseFloat(v.trim())).filter(v => !isNaN(v));
        const current = values[0] ?? 0;
        const avg = values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0;
        cores.push({ core: coreId, current, avg: Math.round(avg) });
      }
    }

    // CPU par groupe fonctionnel (task-manager, pan_task, etc.)
    const cpuLoadPct = minute?.["cpu-load-percent"];
    if (cpuLoadPct?.entry) {
      const entries = Array.isArray(cpuLoadPct.entry) ? cpuLoadPct.entry : [cpuLoadPct.entry];
      for (const entry of entries) {
        const values = String(entry.value).split(",").map((v: string) => parseFloat(v.trim())).filter(v => !isNaN(v));
        const current = values[0] ?? 0;
        const avg = values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0;
        groups.push({ name: entry.name || entry.coreid || "unknown", current, avg: Math.round(avg) });
      }
    }

    // Processus DP par task (pan_task_X, pan_comm, pan_hdl, etc.)
    // Disponible sous resource-monitor/data-processors/dp0/minute/task
    const taskSection = minute?.task ?? dp[dpName]?.task;
    if (taskSection?.entry) {
      const entries = Array.isArray(taskSection.entry) ? taskSection.entry : [taskSection.entry];
      for (const entry of entries) {
        const values = String(entry.value ?? entry["cpu-load"] ?? "0")
          .split(",").map((v: string) => parseFloat(v.trim())).filter(v => !isNaN(v));
        const current = values[0] ?? 0;
        const avg = values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0;
        dpProcesses.push({
          name: entry.name || entry.taskname || entry.coreid || "unknown",
          core: parseInt(entry.coreid ?? "-1", 10),
          cpu: current,
          avg: Math.round(avg),
        });
      }
    }

    // Fallback : certaines versions PAN-OS exposent les tasks sous cpu-load-percent avec un champ "name"
    // On déduplique avec groups (qui contient déjà ces données sous un autre format)
  }

  // Agréger les processus DP par nom (somme sur tous les cores)
  const dpProcMap = new Map<string, { name: string; cpu: number; avg: number; cores: number }>();
  for (const p of dpProcesses) {
    const existing = dpProcMap.get(p.name);
    if (existing) {
      existing.cpu += p.cpu;
      existing.avg += p.avg;
      existing.cores += 1;
    } else {
      dpProcMap.set(p.name, { name: p.name, cpu: p.cpu, avg: p.avg, cores: 1 });
    }
  }
  const dpProcessesSorted = Array.from(dpProcMap.values())
    .sort((a, b) => b.cpu - a.cpu)
    .slice(0, 15);
  
  const activeCores = cores.filter(c => c.current > 0);
  const avgCurrent = activeCores.length > 0 
    ? Math.round(activeCores.reduce((sum, c) => sum + c.current, 0) / activeCores.length)
    : 0;
  const maxCurrent = cores.length > 0 ? Math.max(...cores.map(c => c.current)) : 0;
  const hotCores = cores.filter(c => c.current > 80);
  
  return {
    cores,
    groups,
    processes: dpProcessesSorted,
    totalCores: cores.length,
    activeCores: activeCores.length,
    averageCPU: avgCurrent,
    maxCPU: maxCurrent,
    hotCores: hotCores.length,
  };
}

/**
 * Parse resource-monitor hour → tendance CPU sur 60 minutes
 * Retourne un tableau de 60 points {minute, avgCPU, maxCPU}
 */
function parseResourceMonitorHour(xml: any): any {
  if (!xml?.response?.result?.["resource-monitor"]) return null;
  
  const rm = xml.response.result["resource-monitor"];
  const dp = rm["data-processors"];
  if (!dp) return null;

  // Collecter toutes les valeurs par index de temps (0=plus récent)
  const timeMap: Map<number, number[]> = new Map();

  for (const dpName of Object.keys(dp)) {
    const hour = dp[dpName]?.hour;
    const cpuLoadAvg = hour?.["cpu-load-average"];
    if (!cpuLoadAvg?.entry) continue;

    const entries = Array.isArray(cpuLoadAvg.entry) ? cpuLoadAvg.entry : [cpuLoadAvg.entry];
    for (const entry of entries) {
      const values = String(entry.value).split(",").map((v: string) => parseFloat(v.trim())).filter(v => !isNaN(v));
      values.forEach((val, idx) => {
        if (!timeMap.has(idx)) timeMap.set(idx, []);
        timeMap.get(idx)!.push(val);
      });
    }
  }

  // Construire le tableau de tendance (du plus ancien au plus récent)
  const points: { label: string; avgCPU: number; maxCPU: number }[] = [];
  const sortedKeys = Array.from(timeMap.keys()).sort((a, b) => b - a); // inverser : 0=plus récent
  sortedKeys.forEach((idx, position) => {
    const vals = timeMap.get(idx)!;
    const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    const max = Math.round(Math.max(...vals));
    const minutesAgo = sortedKeys.length - 1 - position;
    points.push({
      label: minutesAgo === 0 ? "Maintenant" : `-${minutesAgo}min`,
      avgCPU: avg,
      maxCPU: max,
    });
  });

  if (points.length === 0) return null;

  const overallAvg = Math.round(points.reduce((s, p) => s + p.avgCPU, 0) / points.length);
  const overallMax = Math.max(...points.map(p => p.maxCPU));
  const sustained = points.filter(p => p.avgCPU > 80).length;

  return {
    points,
    overallAvg,
    overallMax,
    sustainedHighCount: sustained, // nombre de minutes > 80%
    isChronic: sustained > 10,     // CPU élevé depuis plus de 10 minutes
  };
}

/**
 * Parse les backlogs d'ingress sur les cores DP
 * Un backlog > 0 = core saturé, les paquets s'accumulent
 */
function parseIngressBacklogs(xml: any): any {
  if (!xml?.response?.result?.["resource-monitor"]) return null;

  const rm = xml.response.result["resource-monitor"];
  const dp = rm["data-processors"];
  if (!dp) return null;

  const backlogs: { core: number; backlog: number }[] = [];

  for (const dpName of Object.keys(dp)) {
    const ingress = dp[dpName]?.["ingress-backlogs"];
    if (!ingress?.entry) continue;

    const entries = Array.isArray(ingress.entry) ? ingress.entry : [ingress.entry];
    for (const entry of entries) {
      const coreId = parseInt(entry.coreid ?? entry.name ?? "0", 10);
      const values = String(entry.value).split(",").map((v: string) => parseFloat(v.trim())).filter(v => !isNaN(v));
      const current = values[0] ?? 0;
      backlogs.push({ core: coreId, backlog: current });
    }
  }

  const saturatedCores = backlogs.filter(b => b.backlog > 0);
  return {
    backlogs,
    saturatedCores: saturatedCores.length,
    maxBacklog: backlogs.length > 0 ? Math.max(...backlogs.map(b => b.backlog)) : 0,
    hasSaturation: saturatedCores.length > 0,
  };
}

/**
 * Parse show session statistics — stats étendues des sessions
 */
function parseSessionStats(xml: any): any {
  if (!xml?.response?.result) return null;
  const r = xml.response.result;

  return {
    active: parseInt(r["num-active"] ?? r.active ?? "0", 10),
    tcp: parseInt(r["num-tcp"] ?? "0", 10),
    udp: parseInt(r["num-udp"] ?? "0", 10),
    icmp: parseInt(r["num-icmp"] ?? "0", 10),
    offloaded: parseInt(r["num-offloaded"] ?? r.offloaded ?? "0", 10),
    predicted: parseInt(r["num-predict"] ?? r.predicted ?? "0", 10),
    discard: parseInt(r["num-discard"] ?? r.discard ?? "0", 10),
    ageAccel: parseInt(r["num-age-accel"] ?? "0", 10),
    ageAccelThresh: parseInt(r["age-accel-thresh"] ?? "0", 10),
  };
}

function parseSessionInfo(xml: any): any {
  if (!xml?.response?.result) return null;
  
  const result = xml.response.result;
  
  // Handle both string and object formats
  let data: any = {};
  
  if (typeof result === "string") {
    // Parse text output
    const matches = {
      supported: result.match(/Number of sessions supported:\s*(\d+)/),
      allocated: result.match(/Number of allocated sessions:\s*(\d+)/),
      activeTCP: result.match(/Number of active TCP sessions:\s*(\d+)/),
      activeUDP: result.match(/Number of active UDP sessions:\s*(\d+)/),
      activeICMP: result.match(/Number of active ICMP sessions:\s*(\d+)/),
      utilization: result.match(/Session table utilization:\s*(\d+)%/),
      packetRate: result.match(/Packet rate:\s*(\d+)\/s/),
      throughput: result.match(/Throughput:\s*(\d+)\s*kbps/),
      newConnRate: result.match(/New connection establish rate:\s*(\d+)\s*cps/),
    };
    
    data = {
      supported: matches.supported ? parseInt(matches.supported[1], 10) : 0,
      allocated: matches.allocated ? parseInt(matches.allocated[1], 10) : 0,
      activeTCP: matches.activeTCP ? parseInt(matches.activeTCP[1], 10) : 0,
      activeUDP: matches.activeUDP ? parseInt(matches.activeUDP[1], 10) : 0,
      activeICMP: matches.activeICMP ? parseInt(matches.activeICMP[1], 10) : 0,
      utilization: matches.utilization ? parseInt(matches.utilization[1], 10) : 0,
      packetRate: matches.packetRate ? parseInt(matches.packetRate[1], 10) : 0,
      throughputKbps: matches.throughput ? parseInt(matches.throughput[1], 10) : 0,
      newConnectionRate: matches.newConnRate ? parseInt(matches.newConnRate[1], 10) : 0,
    };
  } else if (typeof result === "object") {
    // Parse XML object
    data = {
      supported: parseInt(result["num-max"] || "0", 10),
      allocated: parseInt(result["num-active"] || "0", 10),
      activeTCP: parseInt(result["num-tcp"] || "0", 10),
      activeUDP: parseInt(result["num-udp"] || "0", 10),
      activeICMP: parseInt(result["num-icmp"] || "0", 10),
      utilization: 0,
      packetRate: parseInt(result["pps"] || "0", 10),
      throughputKbps: parseInt(result["kbps"] || "0", 10),
      newConnectionRate: parseInt(result["cps"] || "0", 10),
    };
    
    if (data.supported > 0) {
      data.utilization = Math.round((data.allocated / data.supported) * 100);
    }
  }
  
  return data;
}

function parseSessionMeter(xml: any): any {
  // TODO: Implement session meter parsing
  return null;
}

function parseCounters(xml: any): any {
  if (!xml?.response?.result) return null;
  
  const counters: any[] = [];
  const result = xml.response.result;
  
  // Handle different formats
  if (result?.global?.counters?.entry) {
    const entries = Array.isArray(result.global.counters.entry) 
      ? result.global.counters.entry 
      : [result.global.counters.entry];
    
    for (const entry of entries) {
      const value = parseInt(entry.value || "0", 10);
      if (value > 0) {
        counters.push({
          name: entry.name || entry.category || "unknown",
          value,
          severity: entry.severity || "info",
          description: entry.desc || entry.description || "",
        });
      }
    }
  }
  
  // Sort by value and return top 30
  counters.sort((a, b) => b.value - a.value);
  
  return {
    total: counters.reduce((sum, c) => sum + c.value, 0),
    drops: counters.filter(c => c.severity === "drop"),
    warnings: counters.filter(c => c.severity === "warn"),
    top30: counters.slice(0, 30),
  };
}

function parseHA(xml: any): any {
  if (!xml?.response?.result) return { enabled: false };
  
  const result = xml.response.result;
  
  // Check if HA is disabled
  if (result?.["ha-not-enabled"]) {
    return { enabled: false };
  }
  
  const group = result?.group;
  if (!group) return { enabled: false };
  
  return {
    enabled: true,
    mode: group["mode"] || "unknown",
    localState: group["local-info"]?.["state"] || "unknown",
    peerState: group["peer-info"]?.["state"] || "unknown",
    syncStatus: group["running-sync"] || "unknown",
    configSyncEnabled: group["running-sync-enabled"] === "yes",
  };
}

function parseRouting(xml: any): any {
  if (!xml?.response?.result) return null;
  
  // TODO: Implement full routing parsing
  return {
    available: true,
  };
}

function parseVPNIke(xml: any): any {
  if (!xml?.response?.result) return [];
  
  const entries = xml.response.result?.entry;
  if (!entries) return [];
  
  const tunnels = Array.isArray(entries) ? entries : [entries];
  
  return tunnels.map((t: any) => ({
    name: t.name || t["gateway-name"] || "unknown",
    peer: t["peer-address"] || t.peer || "unknown",
    state: t.state || "unknown",
    ikever: t["ike-ver"] || t.version || "unknown",
  }));
}

function parseVPNIpsec(xml: any): any {
  if (!xml?.response?.result) return [];
  
  const entries = xml.response.result?.entry;
  if (!entries) return [];
  
  const tunnels = Array.isArray(entries) ? entries : [entries];
  
  return tunnels.map((t: any) => ({
    name: t.name || t["tunnel-name"] || "unknown",
    state: t.state || "unknown",
    localSpi: t["local-spi"] || "unknown",
    remoteSpi: t["remote-spi"] || "unknown",
  }));
}

function parseGlobalProtect(xml: any): any {
  if (!xml?.response?.result) return { users: [] };
  
  const entries = xml.response.result?.entry;
  if (!entries) return { users: [] };
  
  const users = Array.isArray(entries) ? entries : [entries];
  
  return {
    totalUsers: users.length,
    users: users.slice(0, 20).map((u: any) => ({
      username: u.username || u["user-name"] || "unknown",
      ip: u["virtual-ip"] || u.ip || "unknown",
      loginTime: u["login-time"] || u["connect-time"] || "unknown",
    })),
  };
}

function parseSystemInfo(xml: any): any {
  if (!xml?.response?.result) return null;
  
  const r = xml.response.result;
  
  return {
    hostname: r.hostname || r.devicename || "unknown",
    model: r.model || "unknown",
    serial: r.serial || "unknown",
    version: r["sw-version"] || r.version || "unknown",
    uptime: r.uptime || "unknown",
  };
}

interface Issue {
  id: string;
  severity: "critical" | "major" | "warning" | "info";
  category: string;
  title: string;
  description: string;
  recommendation: string;
  value?: number | string;
  threshold?: number | string;
}

function analyzeAndDetectIssues(diagnostic: any): Issue[] {
  const issues: Issue[] = [];
  
  // 1. Check Data Plane CPU (valeur actuelle)
  if (diagnostic.dataPlane?.averageCPU > 80) {
    issues.push({
      id: "dp-cpu-critical",
      severity: diagnostic.dataPlane.averageCPU > 90 ? "critical" : "major",
      category: "performance",
      title: "Data Plane CPU élevé",
      description: `CPU Data Plane à ${diagnostic.dataPlane.averageCPU}% moy / ${diagnostic.dataPlane.maxCPU}% max (${diagnostic.dataPlane.hotCores || 0} core(s) > 80%)`,
      recommendation: "1. Vérifier les groupes fonctionnels (flow_lookup, app-id, content-id)\n2. Réduire les règles App-ID/Content-ID complexes\n3. Vérifier le déchiffrement SSL\n4. Considérer l'upgrade matériel",
      value: diagnostic.dataPlane.averageCPU,
      threshold: 80,
    });
  }

  // 1b. CPU DP chroniquement élevé (tendance 1h)
  if (diagnostic.cpuHistory?.isChronic) {
    issues.push({
      id: "dp-cpu-chronic",
      severity: "major",
      category: "performance",
      title: "CPU Data Plane chroniquement élevé",
      description: `CPU > 80% pendant ${diagnostic.cpuHistory.sustainedHighCount} minutes sur la dernière heure (moy: ${diagnostic.cpuHistory.overallAvg}%, max: ${diagnostic.cpuHistory.overallMax}%)`,
      recommendation: "1. Problème structurel, pas un pic ponctuel\n2. Analyser les règles de sécurité complexes\n3. Vérifier la charge SSL/TLS\n4. Envisager un upgrade ou une redistribution de charge",
      value: diagnostic.cpuHistory.sustainedHighCount,
      threshold: 10,
    });
  }

  // 1c. Backlogs d'ingress (cores saturés)
  if (diagnostic.ingressBacklogs?.hasSaturation) {
    issues.push({
      id: "dp-ingress-backlog",
      severity: "critical",
      category: "performance",
      title: "Saturation ingress Data Plane",
      description: `${diagnostic.ingressBacklogs.saturatedCores} core(s) avec backlog ingress (max: ${diagnostic.ingressBacklogs.maxBacklog}) — les paquets s'accumulent`,
      recommendation: "1. Urgence : le firewall ne peut plus traiter les paquets entrants\n2. Réduire immédiatement la charge\n3. Vérifier les attaques DDoS ou flood\n4. Contacter le TAC Palo Alto",
      value: diagnostic.ingressBacklogs.maxBacklog,
      threshold: 0,
    });
  }
  
  // 2. Check Management Plane CPU
  if (diagnostic.managementPlane?.cpu?.total > 70) {
    issues.push({
      id: "mp-cpu-warning",
      severity: diagnostic.managementPlane.cpu.total > 85 ? "major" : "warning",
      category: "performance",
      title: "Management Plane CPU élevé",
      description: `CPU Management à ${diagnostic.managementPlane.cpu.total}%`,
      recommendation: "1. Vérifier les processus avec 'show system resources'\n2. Réduire le logging si nécessaire",
      value: diagnostic.managementPlane.cpu.total,
      threshold: 70,
    });
  }
  
  // 3. Check Memory
  if (diagnostic.managementPlane?.memory?.percentUsed > 80) {
    issues.push({
      id: "memory-warning",
      severity: diagnostic.managementPlane.memory.percentUsed > 90 ? "critical" : "warning",
      category: "performance",
      title: "Mémoire élevée",
      description: `Utilisation mémoire à ${diagnostic.managementPlane.memory.percentUsed}%`,
      recommendation: "1. Identifier les processus consommateurs\n2. Vérifier les fuites mémoire",
      value: diagnostic.managementPlane.memory.percentUsed,
      threshold: 80,
    });
  }
  
  // 4. Check Session Utilization
  if (diagnostic.sessions?.utilization > 70) {
    issues.push({
      id: "session-warning",
      severity: diagnostic.sessions.utilization > 85 ? "critical" : "warning",
      category: "capacity",
      title: "Table de sessions élevée",
      description: `${diagnostic.sessions.utilization}% d'utilisation (${diagnostic.sessions.allocated}/${diagnostic.sessions.supported})`,
      recommendation: "1. Réduire les timeouts de session\n2. Vérifier les connexions légitimes vs attaques",
      value: diagnostic.sessions.utilization,
      threshold: 70,
    });
  }
  
  // 5. Check Packet Rate
  if (diagnostic.sessions?.packetRate > 500000) {
    issues.push({
      id: "pps-high",
      severity: "info",
      category: "performance",
      title: "Trafic élevé",
      description: `${(diagnostic.sessions.packetRate / 1000).toFixed(0)}K pps`,
      recommendation: "Surveiller l'évolution du trafic",
      value: diagnostic.sessions.packetRate,
      threshold: 500000,
    });
  }
  
  // 6. Check Drops
  if (diagnostic.counters?.drops?.length > 0) {
    const totalDrops = diagnostic.counters.drops.reduce((sum: number, d: any) => sum + d.value, 0);
    if (totalDrops > 1000) {
      issues.push({
        id: "drops-warning",
        severity: totalDrops > 10000 ? "major" : "warning",
        category: "network",
        title: "Drops de paquets détectés",
        description: `${totalDrops.toLocaleString()} paquets droppés (${diagnostic.counters.drops.length} raisons)`,
        recommendation: "1. Analyser les raisons avec 'show counter global filter delta yes'\n2. Vérifier les règles de sécurité",
        value: totalDrops,
        threshold: 1000,
      });
    }
  }
  
  // 7. Check HA
  if (diagnostic.ha?.enabled) {
    const problematicStates = ["disconnected", "non-functional", "suspended", "initial"];
    if (problematicStates.includes(diagnostic.ha.peerState?.toLowerCase())) {
      issues.push({
        id: "ha-peer-down",
        severity: "critical",
        category: "ha",
        title: "HA Peer problématique",
        description: `Peer HA en état: ${diagnostic.ha.peerState}`,
        recommendation: "1. Vérifier la connectivité avec le peer\n2. Vérifier les logs HA",
        value: diagnostic.ha.peerState,
      });
    }
    
    if (diagnostic.ha.syncStatus !== "synchronized") {
      issues.push({
        id: "ha-sync-warning",
        severity: "warning",
        category: "ha",
        title: "HA non synchronisé",
        description: `Sync status: ${diagnostic.ha.syncStatus}`,
        recommendation: "Vérifier la synchronisation HA",
        value: diagnostic.ha.syncStatus,
      });
    }
  }
  
  // 8. Check VPN
  if (diagnostic.vpn?.ike?.length > 0) {
    const downTunnels = diagnostic.vpn.ike.filter((t: any) => 
      !["established", "up", "connected"].includes(t.state?.toLowerCase())
    );
    
    if (downTunnels.length > 0) {
      issues.push({
        id: "vpn-ike-down",
        severity: "major",
        category: "vpn",
        title: "Tunnels IKE down",
        description: `${downTunnels.length} tunnel(s) IKE non établis`,
        recommendation: "1. Vérifier la connectivité avec les peers\n2. Vérifier les logs IKE",
        value: downTunnels.length,
      });
    }
  }
  
  // 9. Check Load Average
  if (diagnostic.managementPlane?.loadAverage?.["1min"] > 10) {
    issues.push({
      id: "load-high",
      severity: "warning",
      category: "performance",
      title: "Load Average élevé",
      description: `Load 1min: ${diagnostic.managementPlane.loadAverage["1min"]}`,
      recommendation: "Vérifier les processus consommateurs",
      value: diagnostic.managementPlane.loadAverage["1min"],
      threshold: 10,
    });
  }
  
  return issues.sort((a, b) => {
    const severityOrder = { critical: 0, major: 1, warning: 2, info: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

function calculateHealthScore(issues: Issue[]): number {
  let score = 100;
  
  for (const issue of issues) {
    switch (issue.severity) {
      case "critical": score -= 25; break;
      case "major": score -= 15; break;
      case "warning": score -= 5; break;
      case "info": score -= 1; break;
    }
  }
  
  return Math.max(0, score);
}
