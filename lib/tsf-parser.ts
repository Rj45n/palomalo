/**
 * Tech Support File (TSF) Parser
 * Parse les fichiers .tgz de Palo Alto Networks pour extraire les données système
 * Version 2.0 - Parsing TAC-Level complet
 */

import { TSFData, TSFDataComplete, InterfaceStats, TSFIssue } from "@/types";
import { parseStringPromise } from "xml2js";
import * as tar from "tar-stream";
import type { Headers as TarHeaders } from "tar-stream";
import * as zlib from "zlib";
import type { Readable } from "stream";

// Import des nouveaux parsers
import parseTechSupportMain from "./tsf-parser-main";
import parseDPMonitorLog, { getDPSummary } from "./tsf-parser-dpmonitor";
import parseMPMonitorLog, { getMPSummary, extractMPResources, extractMPProcesses } from "./tsf-parser-mpmonitor";
import logParsers, { analyzeLogs, detectLogIssues } from "./tsf-parser-logs";
import detectAllIssues, { calculateHealthScore } from "./tsf-issue-detector";

/**
 * Parse un fichier TSF (.tgz)
 * @param buffer - Buffer du fichier .tgz
 * @param filename - Nom du fichier
 * @returns Données extraites du TSF
 */
export async function parseTSF(buffer: Buffer, filename: string): Promise<TSFData> {
  const files: Record<string, string> = {};
  
  return new Promise((resolve, reject) => {
    const extract = tar.extract();
    
    extract.on("entry", (header: TarHeaders, stream: Readable, next: () => void) => {
      const chunks: Buffer[] = [];
      
      stream.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });
      
      stream.on("end", () => {
        const content = Buffer.concat(chunks).toString("utf-8");
        files[header.name] = content;
        next();
      });
      
      stream.resume();
    });
    
    extract.on("finish", async () => {
      try {
        const tsfData = await extractTSFData(files, filename);
        resolve(tsfData);
      } catch (error) {
        reject(error);
      }
    });
    
    extract.on("error", reject);
    
    // Décompresser et extraire
    const gunzip = zlib.createGunzip();
    gunzip.pipe(extract);
    gunzip.write(buffer);
    gunzip.end();
  });
}

/**
 * Extrait les données du TSF depuis les fichiers parsés
 */
async function extractTSFData(files: Record<string, string>, filename: string): Promise<TSFData> {
  const tsfData: TSFData = {
    metadata: {
      filename,
      uploadedAt: new Date().toISOString(),
      size: Object.values(files).reduce((sum, content) => sum + content.length, 0),
    },
    system: {
      hostname: "N/A",
      model: "N/A",
      serial: "N/A",
      version: "N/A",
      uptime: "N/A",
    },
    hardware: {
      cpu: "N/A",
      memory: "N/A",
      disk: "N/A",
    },
    processes: [],
    logs: {
      critical: [],
      errors: [],
      warnings: [],
    },
    licenses: [],
    interfaces: [],
    sessions: {
      max: 0,
      current: 0,
      history: [],
    },
  };

  // Parser les différents fichiers du TSF
  for (const [path, content] of Object.entries(files)) {
    try {
      // System info
      if (path.includes("show_system_info")) {
        await parseSystemInfo(content, tsfData);
      }
      
      // System resources (contient aussi les données top/processes)
      if (path.includes("show_system_resources")) {
        parseSystemResources(content, tsfData);
        parseProcesses(content, tsfData);
      }
      
      // Processes (fichiers séparés)
      if (path.includes("top") || path.includes("process")) {
        parseProcesses(content, tsfData);
      }
      
      // Logs système
      if (path.includes("ms.log") || path.includes("system.log")) {
        parseLogs(content, tsfData);
      }
      
      // Logs avancés (mp-log, dp-monitor, etc.)
      if (path.includes("mp-monitor.log")) {
        parseMonitorLog(content, tsfData, "mp");
      }
      
      if (path.includes("dp-monitor.log")) {
        parseMonitorLog(content, tsfData, "dp");
      }
      
      if (path.includes("useridd.log")) {
        parseLogs(content, tsfData);
      }
      
      if (path.includes("devsrvr.log")) {
        parseLogs(content, tsfData);
      }
      
      // Crashinfo
      if (path.includes("crashinfo") || path.includes("core")) {
        parseCrashInfo(content, tsfData, path);
      }
      
      // Running config
      if (path.includes("running-config.xml")) {
        await parseRunningConfig(content, tsfData);
      }
      
      // HA status
      if (path.includes("show_high-availability")) {
        await parseHAStatus(content, tsfData);
      }
      
      // Licenses
      if (path.includes("show_license")) {
        await parseLicenses(content, tsfData);
      }
      
      // Interfaces
      if (path.includes("show_interface")) {
        await parseInterfaces(content, tsfData);
      }
      
      // Sessions
      if (path.includes("show_session")) {
        await parseSessions(content, tsfData);
      }
    } catch (error) {
      console.error(`Erreur parsing ${path}:`, error);
    }
  }

  return tsfData;
}

/**
 * Parse les informations système
 */
async function parseSystemInfo(content: string, tsfData: TSFData) {
  try {
    const xml = await parseStringPromise(content, {
      explicitArray: false,
      mergeAttrs: true,
      trim: true,
    });

    const system = xml?.response?.result?.system;
    if (system) {
      tsfData.system.hostname = system.hostname || system.devicename || tsfData.system.hostname;
      tsfData.system.model = system.model || tsfData.system.model;
      tsfData.system.serial = system.serial || tsfData.system.serial;
      tsfData.system.version = system["sw-version"] || system.version || tsfData.system.version;
      tsfData.system.uptime = system.uptime || tsfData.system.uptime;
    }
  } catch (error) {
    // Essayer de parser en texte brut
    const lines = content.split("\n");
    lines.forEach((line) => {
      if (line.includes("hostname:")) tsfData.system.hostname = line.split(":")[1]?.trim() || tsfData.system.hostname;
      if (line.includes("model:")) tsfData.system.model = line.split(":")[1]?.trim() || tsfData.system.model;
      if (line.includes("serial:")) tsfData.system.serial = line.split(":")[1]?.trim() || tsfData.system.serial;
      if (line.includes("sw-version:")) tsfData.system.version = line.split(":")[1]?.trim() || tsfData.system.version;
      if (line.includes("uptime:")) tsfData.system.uptime = line.split(":")[1]?.trim() || tsfData.system.uptime;
    });
  }
}

/**
 * Parse les ressources système
 */
function parseSystemResources(content: string, tsfData: TSFData) {
  const lines = content.split("\n");
  
  lines.forEach((line) => {
    // CPU - extraire idle et calculer utilisation
    if (line.includes("%Cpu")) {
      const idleMatch = line.match(/(\d+\.\d+)\s+id/);
      if (idleMatch) {
        const idle = parseFloat(idleMatch[1]);
        const usage = 100 - idle;
        tsfData.hardware.cpu = usage.toFixed(1) + "%";
      }
    }
    
    // Memory - extraire total et used
    if (line.includes("MiB Mem") || line.includes("KiB Mem")) {
      const match = line.match(/(\d+\.?\d*)\s+total.*?(\d+\.?\d*)\s+used/);
      if (match) {
        const total = parseFloat(match[1]);
        const used = parseFloat(match[2]);
        const usedPercent = ((used / total) * 100).toFixed(1);
        tsfData.hardware.memory = `${used.toFixed(0)} MB / ${total.toFixed(0)} MB (${usedPercent}%)`;
      }
    }
    
    // Disk
    if (line.includes("Filesystem") || line.includes("/dev/")) {
      const match = line.match(/(\d+)%/);
      if (match) {
        tsfData.hardware.disk = match[1] + "%";
      }
    }
  });
}

/**
 * Parse les processus
 */
function parseProcesses(content: string, tsfData: TSFData) {
  const lines = content.split("\n");
  const processes: typeof tsfData.processes = [];
  
  lines.forEach((line) => {
    // Format top: PID USER PR NI VIRT RES SHR S %CPU %MEM TIME+ COMMAND
    // Plusieurs formats possibles
    
    // Format standard top Linux
    // Exemple:  1234 root      20   0 4567890 567890  45678 S  45.2   1.7  567:89.12 pan_task
    let match = line.match(/^\s*(\d+)\s+\S+\s+\d+\s+[-\d]+\s+\S+\s+\S+\s+\S+\s+\S\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+\S+\s+(.+)$/);
    
    // Format alternatif (moins de colonnes)
    if (!match) {
      match = line.match(/^\s*(\d+)\s+\S+\s+.*?\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+\S+\s+(\S+.*)$/);
    }
    
    // Format très simplifié (PID ... CPU MEM ... COMMAND)
    if (!match) {
      // Chercher les lignes qui commencent par un PID (nombre) suivi de données
      const simpleMatch = line.match(/^\s*(\d{2,})\s+.*?\s+(\d+\.?\d+)\s+(\d+\.?\d+)\s+[\d:\.]+\s+(\S+.*)$/);
      if (simpleMatch) {
        match = simpleMatch;
      }
    }
    
    if (match && processes.length < 20) {
      const cpu = parseFloat(match[2]);
      const memory = parseFloat(match[3]);
      
      // Ignorer les processus avec CPU et Memory à 0
      if (cpu > 0 || memory > 0) {
        processes.push({
          pid: match[1],
          name: match[4].trim(),
          cpu,
          memory,
        });
      }
    }
  });
  
  // Trier par CPU et garder les 20 premiers
  if (processes.length > 0) {
    tsfData.processes = processes.sort((a, b) => b.cpu - a.cpu).slice(0, 20);
  }
}

/**
 * Parse les logs
 */
function parseLogs(content: string, tsfData: TSFData) {
  const lines = content.split("\n");
  
  lines.forEach((line) => {
    if (line.includes("CRITICAL") || line.includes("FATAL")) {
      tsfData.logs.critical.push(line.trim());
    } else if (line.includes("ERROR")) {
      tsfData.logs.errors.push(line.trim());
    } else if (line.includes("WARN")) {
      tsfData.logs.warnings.push(line.trim());
    }
  });
  
  // Limiter à 100 entrées par catégorie
  tsfData.logs.critical = tsfData.logs.critical.slice(-100);
  tsfData.logs.errors = tsfData.logs.errors.slice(-100);
  tsfData.logs.warnings = tsfData.logs.warnings.slice(-100);
}

/**
 * Parse le statut HA
 */
async function parseHAStatus(content: string, tsfData: TSFData) {
  try {
    const xml = await parseStringPromise(content, {
      explicitArray: false,
      mergeAttrs: true,
      trim: true,
    });

    const ha = xml?.response?.result;
    if (ha) {
      tsfData.ha = {
        enabled: ha.enabled === "yes" || ha.enabled === true,
        state: ha.state || ha["local-info"]?.state || "unknown",
        peer: ha["peer-info"]?.["mgmt-ip"] || undefined,
        syncStatus: ha["running-sync"] || undefined,
      };
    }
  } catch (error) {
    // Ignorer si pas de HA
  }
}

/**
 * Parse les licenses
 */
async function parseLicenses(content: string, tsfData: TSFData) {
  try {
    const xml = await parseStringPromise(content, {
      explicitArray: false,
      mergeAttrs: true,
      trim: true,
    });

    const licenses = xml?.response?.result?.licenses?.entry;
    if (licenses) {
      const licenseArray = Array.isArray(licenses) ? licenses : [licenses];
      tsfData.licenses = licenseArray.map((lic: any) => ({
        feature: lic.feature || lic.name || "Unknown",
        expires: lic.expired || lic.expiry || "N/A",
        status: lic.expired === "yes" ? "expired" : "active",
      }));
    }
  } catch (error) {
    // Ignorer si erreur
  }
}

/**
 * Parse les interfaces
 */
async function parseInterfaces(content: string, tsfData: TSFData) {
  try {
    const xml = await parseStringPromise(content, {
      explicitArray: false,
      mergeAttrs: true,
      trim: true,
    });

    const interfaces = xml?.response?.result?.ifnet?.entry;
    if (interfaces) {
      const ifArray = Array.isArray(interfaces) ? interfaces : [interfaces];
      tsfData.interfaces = ifArray.map((iface: any) => ({
        name: iface.name || "unknown",
        status: iface.state === "up" ? "up" : "down",
        speed: iface.speed || "N/A",
        rx: parseInt(iface.ibytes || "0", 10),
        tx: parseInt(iface.obytes || "0", 10),
        rxPackets: parseInt(iface.ipackets || "0", 10),
        txPackets: parseInt(iface.opackets || "0", 10),
        rxErrors: parseInt(iface.ierrors || "0", 10),
        txErrors: parseInt(iface.oerrors || "0", 10),
        rxDrops: parseInt(iface.idrops || "0", 10),
        txDrops: parseInt(iface.odrops || "0", 10),
      }));
    }
  } catch (error) {
    // Ignorer si erreur
  }
}

/**
 * Parse les sessions
 */
async function parseSessions(content: string, tsfData: TSFData) {
  try {
    const xml = await parseStringPromise(content, {
      explicitArray: false,
      mergeAttrs: true,
      trim: true,
    });

    const result = xml?.response?.result;
    if (result) {
      tsfData.sessions.max = parseInt(result["max-sessions"] || result.max || "0", 10);
      tsfData.sessions.current = parseInt(result["num-active"] || result.total || "0", 10);
    }
  } catch (error) {
    // Ignorer si erreur
  }
}

/**
 * Parse les fichiers monitor (mp-monitor.log, dp-monitor.log)
 * Extrait l'historique CPU/mémoire
 */
function parseMonitorLog(content: string, tsfData: TSFData, type: "mp" | "dp") {
  const lines = content.split("\n");
  const cpuTrend: { time: string; value: number }[] = [];
  const memoryTrend: { time: string; value: number }[] = [];
  
  lines.forEach((line) => {
    // Format typique: 2026/04/08 10:15:30 CPU: 45.2% Memory: 67.8%
    const timestampMatch = line.match(/(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})/);
    const cpuMatch = line.match(/CPU[:\s]+(\d+\.?\d*)%/i);
    const memMatch = line.match(/Memory[:\s]+(\d+\.?\d*)%/i);
    
    if (timestampMatch) {
      const time = timestampMatch[1];
      
      if (cpuMatch) {
        cpuTrend.push({
          time,
          value: parseFloat(cpuMatch[1]),
        });
      }
      
      if (memMatch) {
        memoryTrend.push({
          time,
          value: parseFloat(memMatch[1]),
        });
      }
    }
  });
  
  // Stocker dans un champ étendu (nécessite TSFAnalysisDeep)
  // Pour l'instant, on stocke les dernières valeurs dans hardware
  if (cpuTrend.length > 0) {
    const latest = cpuTrend[cpuTrend.length - 1];
    if (type === "mp") {
      tsfData.hardware.cpu = `${latest.value}%`;
    }
  }
  
  if (memoryTrend.length > 0) {
    const latest = memoryTrend[memoryTrend.length - 1];
    tsfData.hardware.memory = `${latest.value}%`;
  }
}

/**
 * Parse les fichiers crashinfo
 * Extrait les backtraces et informations de crash
 */
function parseCrashInfo(content: string, tsfData: TSFData, filepath: string) {
  const lines = content.split("\n");
  let timestamp = "unknown";
  let process = "unknown";
  let backtrace = "";
  
  lines.forEach((line, index) => {
    // Extraire le timestamp
    if (line.includes("Time:") || line.includes("Date:")) {
      const match = line.match(/(\d{4}[-\/]\d{2}[-\/]\d{2}\s+\d{2}:\d{2}:\d{2})/);
      if (match) timestamp = match[1];
    }
    
    // Extraire le nom du processus
    if (line.includes("Process:") || line.includes("Command:")) {
      const match = line.match(/(?:Process|Command)[:\s]+(.+)/);
      if (match) process = match[1].trim();
    }
    
    // Extraire le backtrace (limité aux 20 premières lignes)
    if (line.includes("Backtrace:") || line.includes("Stack trace:")) {
      backtrace = lines.slice(index, index + 20).join("\n");
    }
    
    // Détecter segfault
    if (line.includes("segfault") || line.includes("SIGSEGV")) {
      if (!process.includes("segfault")) {
        process += " (segfault)";
      }
    }
  });
  
  // Ajouter aux logs critiques
  if (process !== "unknown") {
    const crashLog = `CRASH: ${process} at ${timestamp} (${filepath})`;
    tsfData.logs.critical.push(crashLog);
  }
}

/**
 * Parse la configuration running
 * Détecte les problèmes de configuration courants
 */
async function parseRunningConfig(content: string, tsfData: TSFData) {
  try {
    // Parser le XML de config
    const xml = await parseStringPromise(content, {
      explicitArray: false,
      mergeAttrs: true,
      trim: true,
    });
    
    // Stocker des infos basiques
    const config = xml?.config?.devices?.entry;
    if (config) {
      // Extraire le hostname si pas déjà fait
      const hostname = config?.deviceconfig?.system?.hostname;
      if (hostname && tsfData.system.hostname === "N/A") {
        tsfData.system.hostname = hostname;
      }
    }
  } catch (error) {
    // Ignorer si erreur de parsing XML
    console.error("Erreur parsing running-config:", error);
  }
}

// ============================================================
// NOUVEAU: Parsing complet TAC-Level
// ============================================================

/**
 * Parse un fichier TSF (.tgz) avec extraction complète TAC-Level
 * @param buffer - Buffer du fichier .tgz
 * @param filename - Nom du fichier
 * @returns Données complètes extraites du TSF
 */
export async function parseTSFComplete(buffer: Buffer, filename: string): Promise<TSFDataComplete> {
  const files: Record<string, string> = {};
  
  return new Promise((resolve, reject) => {
    const extract = tar.extract();
    
    extract.on("entry", (header: TarHeaders, stream: Readable, next: () => void) => {
      const chunks: Buffer[] = [];
      
      stream.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });
      
      stream.on("end", () => {
        try {
          const content = Buffer.concat(chunks).toString("utf-8");
          files[header.name] = content;
        } catch {
          // Ignorer les fichiers binaires
        }
        next();
      });
      
      stream.resume();
    });
    
    extract.on("finish", async () => {
      try {
        const startTime = Date.now();
        const tsfData = await extractTSFDataComplete(files, filename);
        tsfData.metadata.parseTime = Date.now() - startTime;
        resolve(tsfData);
      } catch (error) {
        reject(error);
      }
    });
    
    extract.on("error", reject);
    
    // Décompresser et extraire
    const gunzip = zlib.createGunzip();
    gunzip.pipe(extract);
    gunzip.write(buffer);
    gunzip.end();
  });
}

/**
 * Extrait les données complètes du TSF
 */
async function extractTSFDataComplete(files: Record<string, string>, filename: string): Promise<TSFDataComplete> {
  // Initialiser la structure de données
  const tsfData: TSFDataComplete = {
    metadata: {
      filename,
      uploadedAt: new Date().toISOString(),
      size: Object.values(files).reduce((sum, content) => sum + content.length, 0),
    },
    system: {
      hostname: "",
      model: "",
      serial: "",
      panosVersion: "",
      uptime: "",
      multiVsys: false,
      operationalMode: "normal",
    },
    resources: {
      management: {
        cpu: 0,
        memory: 0,
        memoryTotal: 0,
        memoryUsed: 0,
        loadAverage: [0, 0, 0],
        swapUsed: 0,
        swapTotal: 0,
      },
      dataplane: {
        cpuAverage: 0,
        cpuByCore: [],
        cpuByGroup: [],
        packetBufferUsage: 0,
        packetDescriptorUsage: 0,
        sessionUtilization: 0,
      },
      disk: {
        partitions: [],
      },
    },
    sessions: {
      supported: 0,
      allocated: 0,
      pending: 0,
      active: 0,
      tcp: 0,
      udp: 0,
      icmp: 0,
      other: 0,
      utilization: 0,
      packetRate: 0,
      throughputKbps: 0,
      newConnectionRate: 0,
      tcpHalfOpen: 0,
      icmpUnreachable: 0,
      timeouts: { tcp: 0, udp: 0, icmp: 0, other: 0 },
    },
    counters: {
      drops: [],
      warnings: [],
      hardware: [],
      top30: [],
      totalDrops: 0,
      criticalCount: 0,
    },
    ha: {
      enabled: false,
      mode: "disabled",
      localState: "unknown",
      localPriority: 100,
      peerState: "unknown",
      runningSync: false,
      runningSyncEnabled: false,
      configSync: "unknown",
      links: {
        ha1: { status: "unknown" },
        ha2: { status: "unknown" },
      },
      preemptive: false,
      promotionHold: 2000,
      helloInterval: 8000,
      heartbeatInterval: 1000,
    },
    interfaces: [],
    routing: {
      totalRoutes: 0,
      virtualRouters: [],
      bgp: { peers: [] },
      ospf: { neighbors: [], areas: 0, lsaCount: 0 },
      staticRoutes: [],
    },
    vpn: {
      ikeGateways: [],
      ipsecTunnels: [],
      ikeSa: [],
      ipsecSa: [],
    },
    globalProtect: {
      gateways: [],
      portals: [],
      users: [],
      statistics: {
        currentUsers: 0,
        previousUsers: 0,
        tunnelEstablishments: 0,
        authSuccesses: 0,
        authFailures: 0,
      },
    },
    licenses: [],
    logs: {
      system: [],
      config: [],
      alarm: [],
      globalProtect: [],
    },
    processes: [],
    software: {
      panosVersion: "",
    },
    history: {
      cpuManagement: [],
      cpuDataplane: [],
      memory: [],
      sessions: [],
      throughput: [],
    },
    config: {
      zonesCount: 0,
      interfacesCount: 0,
      securityRulesCount: 0,
      natRulesCount: 0,
      pbfRulesCount: 0,
      qosRulesCount: 0,
      addressObjectsCount: 0,
      serviceObjectsCount: 0,
      applicationFiltersCount: 0,
    },
    issues: [],
    healthScore: 100,
  };

  // Parcourir et traiter chaque fichier
  for (const [path, content] of Object.entries(files)) {
    try {
      // Fichier techsupport principal
      if (path.includes("techsupport_") && path.endsWith(".txt")) {
        console.log(`📄 Parsing techsupport main: ${path}`);
        const mainData = parseTechSupportMain(content);
        mergeData(tsfData, mainData);
      }
      
      // dp-monitor.log (Data Plane)
      if (path.includes("dp-monitor.log")) {
        console.log(`📊 Parsing dp-monitor.log...`);
        const dpData = parseDPMonitorLog(content);
        
        if (dpData.latestSnapshot) {
          // Mettre à jour les ressources Data Plane
          if (dpData.latestSnapshot.cpuByCore) {
            tsfData.resources.dataplane.cpuByCore = dpData.latestSnapshot.cpuByCore;
          }
          if (dpData.latestSnapshot.cpuByGroup) {
            tsfData.resources.dataplane.cpuByGroup = dpData.latestSnapshot.cpuByGroup;
          }
          tsfData.resources.dataplane.cpuAverage = dpData.avgCpuByCore;
        }
        
        // Historique CPU
        tsfData.history.cpuDataplane = dpData.cpuHistory;
        
        // Processus Data Plane
        if (dpData.latestSnapshot?.processes) {
          tsfData.processes = [...tsfData.processes, ...dpData.latestSnapshot.processes];
        }
      }
      
      // mp-monitor.log (Management Plane)
      if (path.includes("mp-monitor.log") && !path.includes("dp-monitor")) {
        console.log(`📊 Parsing mp-monitor.log...`);
        const mpData = parseMPMonitorLog(content);
        
        // Mettre à jour les ressources Management Plane
        const mpResources = extractMPResources(mpData);
        Object.assign(tsfData.resources.management, mpResources);
        
        // Historique CPU/Memory
        tsfData.history.cpuManagement = mpData.cpuHistory;
        tsfData.history.memory = mpData.memoryHistory;
        
        // Processus
        const mpProcesses = extractMPProcesses(mpData);
        tsfData.processes = [...tsfData.processes, ...mpProcesses];
        
        // Disk partitions
        if (mpData.latestSnapshot?.disk) {
          tsfData.resources.disk.partitions = mpData.latestSnapshot.disk.map(d => ({
            name: d.mount,
            size: "N/A",
            used: `${d.usedKb} KB`,
            available: "N/A",
            usagePercent: d.usedPercent,
            mountPoint: d.mount,
          }));
        }
      }
      
      // Logs système
      if (path.includes("show_log_system.txt")) {
        console.log(`📝 Parsing system logs...`);
        tsfData.logs.system = logParsers.parseSystemLog(content);
      }
      
      // Logs config
      if (path.includes("show_log_config.txt")) {
        console.log(`📝 Parsing config logs...`);
        tsfData.logs.config = logParsers.parseConfigLog(content);
      }
      
      // Logs alarm
      if (path.includes("show_log_alarm.txt")) {
        console.log(`📝 Parsing alarm logs...`);
        tsfData.logs.alarm = logParsers.parseAlarmLog(content);
      }
      
      // Logs GlobalProtect
      if (path.includes("show_log_globalprotect.txt")) {
        console.log(`📝 Parsing GlobalProtect logs...`);
        tsfData.logs.globalProtect = logParsers.parseGlobalProtectLog(content);
      }
      
    } catch (error) {
      console.error(`Erreur parsing ${path}:`, error);
    }
  }

  // Dédupliquer les processus et trier par CPU
  const processMap = new Map<number, typeof tsfData.processes[0]>();
  for (const proc of tsfData.processes) {
    if (!processMap.has(proc.pid) || processMap.get(proc.pid)!.cpu < proc.cpu) {
      processMap.set(proc.pid, proc);
    }
  }
  tsfData.processes = Array.from(processMap.values())
    .sort((a, b) => b.cpu - a.cpu)
    .slice(0, 50);

  // Détecter les problèmes
  console.log(`🔍 Détection des problèmes...`);
  tsfData.issues = detectAllIssues(tsfData);
  
  // Détecter les problèmes dans les logs
  const allLogs = [
    ...tsfData.logs.system,
    ...tsfData.logs.alarm,
  ];
  const logIssues = detectLogIssues(allLogs);
  for (const issue of logIssues) {
    tsfData.issues.push({
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      severity: issue.severity === "critical" ? "critical" : issue.severity === "error" ? "major" : "warning",
      category: "logs",
      title: issue.issue,
      description: `Détecté ${issue.count} occurrence(s) dans les logs`,
      impact: "À investiguer selon la nature du problème",
      recommendation: "Analyser les logs pour plus de détails",
      evidence: issue.sample,
    });
  }
  
  // Calculer le health score
  tsfData.healthScore = calculateHealthScore(tsfData.issues);
  
  console.log(`✅ Parsing terminé: ${tsfData.issues.length} problèmes détectés, Health Score: ${tsfData.healthScore}/100`);
  
  return tsfData;
}

/**
 * Fusionne les données partielles dans le TSF complet
 */
function mergeData(target: Partial<TSFDataComplete>, source: Partial<TSFDataComplete>): void {
  for (const key of Object.keys(source) as (keyof TSFDataComplete)[]) {
    const sourceValue = source[key];
    if (sourceValue === undefined || sourceValue === null) continue;
    
    if (typeof sourceValue === "object" && !Array.isArray(sourceValue)) {
      // Objet: fusionner récursivement
      if (!target[key]) {
        (target as any)[key] = {};
      }
      Object.assign((target as any)[key], sourceValue);
    } else if (Array.isArray(sourceValue) && sourceValue.length > 0) {
      // Array: remplacer si l'array source n'est pas vide
      (target as any)[key] = sourceValue;
    } else if (typeof sourceValue === "string" && sourceValue !== "") {
      (target as any)[key] = sourceValue;
    } else if (typeof sourceValue === "number" && sourceValue !== 0) {
      (target as any)[key] = sourceValue;
    } else if (typeof sourceValue === "boolean") {
      (target as any)[key] = sourceValue;
    }
  }
}
