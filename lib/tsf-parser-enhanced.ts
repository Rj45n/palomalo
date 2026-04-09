/**
 * Parser TSF amélioré pour extraire toutes les métriques TAC-level
 * Extraction des données du fichier techsupport principal
 */

import { TSFData } from "@/types";

export interface TSFMetricsEnhanced {
  // System
  system: {
    hostname: string;
    model: string;
    serial: string;
    version: string;
    uptime: string;
    multiVsys: boolean;
    haEnabled: boolean;
  };
  
  // CPU & Resources
  resources: {
    managementCPU: number;
    dataplaneCPU: number;
    memory: {
      total: number;
      used: number;
      free: number;
      percentUsed: number;
    };
    disk: {
      total: number;
      used: number;
      free: number;
      percentUsed: number;
    };
  };
  
  // Sessions
  sessions: {
    supported: number;
    allocated: number;
    activeTCP: number;
    activeUDP: number;
    activeICMP: number;
    utilization: number;
    packetRate: number;
    throughputKbps: number;
    newConnectionRate: number;
  };
  
  // HA Status
  ha: {
    enabled: boolean;
    localState: string;
    peerState: string;
    syncStatus: string;
    lastFailover?: string;
  };
  
  // Interfaces avec problèmes
  interfaces: {
    name: string;
    status: string;
    rxErrors: number;
    txErrors: number;
    rxDrops: number;
    txDrops: number;
    crcErrors: number;
  }[];
  
  // Global Counters (drops)
  counters: {
    name: string;
    value: number;
    severity: string;
    description: string;
  }[];
  
  // Logs d'erreurs
  errors: {
    timestamp: string;
    severity: string;
    message: string;
    source: string;
  }[];
  
  // Processus problématiques
  processes: {
    name: string;
    pid: number;
    cpu: number;
    memory: number;
    state: string;
  }[];
  
  // Routing
  routing: {
    totalRoutes: number;
    bgpPeers: { name: string; state: string; prefixes: number }[];
    ospfNeighbors: { id: string; state: string }[];
  };
  
  // VPN
  vpn: {
    ikeTunnels: { name: string; state: string; peer: string }[];
    ipsecTunnels: { name: string; state: string; spi: string }[];
  };
  
  // GlobalProtect
  globalProtect: {
    connectedUsers: number;
    tunnels: { user: string; ip: string; duration: string }[];
  };
  
  // Timestamps
  timestamps: {
    tsfGenerated: string;
    lastCommit: string;
    lastReboot: string;
  };
}

/**
 * Parse le fichier techsupport principal
 */
export function parseTechSupportFile(content: string): TSFMetricsEnhanced {
  const metrics: TSFMetricsEnhanced = {
    system: {
      hostname: "",
      model: "",
      serial: "",
      version: "",
      uptime: "",
      multiVsys: false,
      haEnabled: false,
    },
    resources: {
      managementCPU: 0,
      dataplaneCPU: 0,
      memory: { total: 0, used: 0, free: 0, percentUsed: 0 },
      disk: { total: 0, used: 0, free: 0, percentUsed: 0 },
    },
    sessions: {
      supported: 0,
      allocated: 0,
      activeTCP: 0,
      activeUDP: 0,
      activeICMP: 0,
      utilization: 0,
      packetRate: 0,
      throughputKbps: 0,
      newConnectionRate: 0,
    },
    ha: {
      enabled: false,
      localState: "standalone",
      peerState: "unknown",
      syncStatus: "unknown",
    },
    interfaces: [],
    counters: [],
    errors: [],
    processes: [],
    routing: {
      totalRoutes: 0,
      bgpPeers: [],
      ospfNeighbors: [],
    },
    vpn: {
      ikeTunnels: [],
      ipsecTunnels: [],
    },
    globalProtect: {
      connectedUsers: 0,
      tunnels: [],
    },
    timestamps: {
      tsfGenerated: "",
      lastCommit: "",
      lastReboot: "",
    },
  };

  try {
    // Parse system info
    parseSystemInfo(content, metrics);
    
    // Parse sessions
    parseSessionInfo(content, metrics);
    
    // Parse HA
    parseHAStatus(content, metrics);
    
    // Parse counters
    parseGlobalCounters(content, metrics);
    
    // Parse interfaces
    parseInterfaces(content, metrics);
    
    // Parse errors from logs
    parseSystemLogs(content, metrics);
    
    // Parse routing
    parseRouting(content, metrics);
    
    // Parse VPN
    parseVPN(content, metrics);
    
  } catch (error) {
    console.error("Erreur parsing TSF:", error);
  }

  return metrics;
}

function parseSystemInfo(content: string, metrics: TSFMetricsEnhanced): void {
  // Hostname
  const hostnameMatch = content.match(/hostname:\s*(.+)/i);
  if (hostnameMatch) metrics.system.hostname = hostnameMatch[1].trim();

  // Model
  const modelMatch = content.match(/model:\s*(.+)/i);
  if (modelMatch) metrics.system.model = modelMatch[1].trim();

  // Serial
  const serialMatch = content.match(/serial:\s*(.+)/i);
  if (serialMatch) metrics.system.serial = serialMatch[1].trim();

  // Version
  const versionMatch = content.match(/sw-version:\s*(.+)/i);
  if (versionMatch) metrics.system.version = versionMatch[1].trim();

  // Uptime
  const uptimeMatch = content.match(/uptime:\s*(.+)/i);
  if (uptimeMatch) metrics.system.uptime = uptimeMatch[1].trim();

  // Multi-vsys
  const multiVsysMatch = content.match(/multi-vsys:\s*(on|off)/i);
  if (multiVsysMatch) metrics.system.multiVsys = multiVsysMatch[1].toLowerCase() === "on";
}

function parseSessionInfo(content: string, metrics: TSFMetricsEnhanced): void {
  // Find session info section
  const sessionSection = content.match(/> show session info[\s\S]*?Number of sessions supported:\s*(\d+)[\s\S]*?Number of allocated sessions:\s*(\d+)[\s\S]*?Number of active TCP sessions:\s*(\d+)[\s\S]*?Number of active UDP sessions:\s*(\d+)[\s\S]*?Number of active ICMP sessions:\s*(\d+)[\s\S]*?Session table utilization:\s*(\d+)%[\s\S]*?Packet rate:\s*(\d+)\/s[\s\S]*?Throughput:\s*(\d+)\s*kbps[\s\S]*?New connection establish rate:\s*(\d+)\s*cps/);
  
  if (sessionSection) {
    metrics.sessions.supported = parseInt(sessionSection[1], 10);
    metrics.sessions.allocated = parseInt(sessionSection[2], 10);
    metrics.sessions.activeTCP = parseInt(sessionSection[3], 10);
    metrics.sessions.activeUDP = parseInt(sessionSection[4], 10);
    metrics.sessions.activeICMP = parseInt(sessionSection[5], 10);
    metrics.sessions.utilization = parseInt(sessionSection[6], 10);
    metrics.sessions.packetRate = parseInt(sessionSection[7], 10);
    metrics.sessions.throughputKbps = parseInt(sessionSection[8], 10);
    metrics.sessions.newConnectionRate = parseInt(sessionSection[9], 10);
  }
}

function parseHAStatus(content: string, metrics: TSFMetricsEnhanced): void {
  // Check if HA is enabled
  const haSection = content.match(/> show high-availability (all|state)[\s\S]*?(Group \d+|Local Information|HA not)/i);
  
  if (haSection && !haSection[0].includes("HA not")) {
    metrics.ha.enabled = true;
    
    // Local state
    const localState = content.match(/Local Information:[\s\S]*?State:\s*(\w+)/i);
    if (localState) metrics.ha.localState = localState[1].toLowerCase();
    
    // Peer state
    const peerState = content.match(/Peer Information:[\s\S]*?State:\s*(\w+)/i);
    if (peerState) metrics.ha.peerState = peerState[1].toLowerCase();
    
    // Sync status
    const syncStatus = content.match(/Configuration Synchronization:[\s\S]*?State:\s*(\w+)/i);
    if (syncStatus) metrics.ha.syncStatus = syncStatus[1].toLowerCase();
  }
}

function parseGlobalCounters(content: string, metrics: TSFMetricsEnhanced): void {
  // Find counter section with drops
  const counterSection = content.match(/> show counter global filter delta yes[\s\S]*?(?=> |$)/);
  
  if (counterSection) {
    // Parse each counter line
    const lines = counterSection[0].split("\n");
    for (const line of lines) {
      // Format: "name                        value    rate severity category aspect description"
      const match = line.match(/^(\S+)\s+(\d+)\s+\d+\s+(drop|warn|error|info)\s+/);
      if (match && parseInt(match[2], 10) > 0) {
        metrics.counters.push({
          name: match[1],
          value: parseInt(match[2], 10),
          severity: match[3],
          description: line.substring(line.lastIndexOf(match[3]) + match[3].length).trim(),
        });
      }
    }
    
    // Sort by value descending
    metrics.counters.sort((a, b) => b.value - a.value);
    
    // Keep top 50
    metrics.counters = metrics.counters.slice(0, 50);
  }
}

function parseInterfaces(content: string, metrics: TSFMetricsEnhanced): void {
  // Find interface stats section
  const ifaceSection = content.match(/> show counter interface all[\s\S]*?(?=> |$)/);
  
  if (ifaceSection) {
    const lines = ifaceSection[0].split("\n");
    let currentIface = "";
    
    for (const line of lines) {
      // Interface name line
      const ifaceMatch = line.match(/^(ethernet\d+\/\d+|ae\d+)/i);
      if (ifaceMatch) {
        currentIface = ifaceMatch[1];
        continue;
      }
      
      // Stats line with errors
      if (currentIface && line.includes("ierr") || line.includes("oerr")) {
        const errMatch = line.match(/ierr[:\s]+(\d+).*?oerr[:\s]+(\d+)/i);
        if (errMatch) {
          const rxErr = parseInt(errMatch[1], 10);
          const txErr = parseInt(errMatch[2], 10);
          
          if (rxErr > 0 || txErr > 0) {
            const existing = metrics.interfaces.find(i => i.name === currentIface);
            if (existing) {
              existing.rxErrors = rxErr;
              existing.txErrors = txErr;
            } else {
              metrics.interfaces.push({
                name: currentIface,
                status: "up",
                rxErrors: rxErr,
                txErrors: txErr,
                rxDrops: 0,
                txDrops: 0,
                crcErrors: 0,
              });
            }
          }
        }
      }
    }
  }
}

function parseSystemLogs(content: string, metrics: TSFMetricsEnhanced): void {
  // Parse system log errors
  const errorPatterns = [
    /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}).*?(critical|error|warning).*?:(.+)/gi,
    /(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}).*?(critical|error|warning).*?:(.+)/gi,
  ];
  
  for (const pattern of errorPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null && metrics.errors.length < 100) {
      metrics.errors.push({
        timestamp: match[1],
        severity: match[2].toLowerCase(),
        message: match[3].trim().substring(0, 200),
        source: "system-log",
      });
    }
  }
  
  // Sort by timestamp descending
  metrics.errors.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

function parseRouting(content: string, metrics: TSFMetricsEnhanced): void {
  // Total routes
  const routeMatch = content.match(/total\s+(\d+)\s+routes/i);
  if (routeMatch) metrics.routing.totalRoutes = parseInt(routeMatch[1], 10);
  
  // BGP peers
  const bgpSection = content.match(/> show routing protocol bgp peer[\s\S]*?(?=> |$)/);
  if (bgpSection) {
    const peerMatches = bgpSection[0].matchAll(/peer\s+(\S+)[\s\S]*?state:\s*(\w+)[\s\S]*?prefix.*?:\s*(\d+)/gi);
    for (const match of peerMatches) {
      metrics.routing.bgpPeers.push({
        name: match[1],
        state: match[2],
        prefixes: parseInt(match[3], 10),
      });
    }
  }
}

function parseVPN(content: string, metrics: TSFMetricsEnhanced): void {
  // IKE tunnels
  const ikeSection = content.match(/> show vpn ike-sa[\s\S]*?(?=> |$)/);
  if (ikeSection) {
    const tunnelMatches = ikeSection[0].matchAll(/(\S+)\s+(\d+\.\d+\.\d+\.\d+)\s+\d+\s+(\w+)/g);
    for (const match of tunnelMatches) {
      metrics.vpn.ikeTunnels.push({
        name: match[1],
        peer: match[2],
        state: match[3],
      });
    }
  }
  
  // IPSec tunnels
  const ipsecSection = content.match(/> show vpn ipsec-sa[\s\S]*?(?=> |$)/);
  if (ipsecSection) {
    const tunnelMatches = ipsecSection[0].matchAll(/(\S+)[\s\S]*?spi:\s*(\S+)[\s\S]*?state:\s*(\w+)/gi);
    for (const match of tunnelMatches) {
      metrics.vpn.ipsecTunnels.push({
        name: match[1],
        spi: match[2],
        state: match[3],
      });
    }
  }
}

/**
 * Parse le fichier mp-monitor.log pour les métriques CPU
 */
export function parseMPMonitorLog(content: string): { 
  cpu: { timestamp: string; us: number; sy: number; ni: number; id: number; wa: number; hi: number; si: number }[];
  memory: { timestamp: string; total: number; used: number; free: number }[];
  topProcesses: { name: string; pid: number; cpu: number; mem: number }[];
} {
  const result = {
    cpu: [] as any[],
    memory: [] as any[],
    topProcesses: [] as any[],
  };

  // Parse CPU from top output
  const cpuMatches = content.matchAll(/%Cpu\(s\):\s*(\d+\.?\d*)\s*us,\s*(\d+\.?\d*)\s*sy,\s*(\d+\.?\d*)\s*ni,\s*(\d+\.?\d*)\s*id,\s*(\d+\.?\d*)\s*wa,\s*(\d+\.?\d*)\s*hi,\s*(\d+\.?\d*)\s*si/g);
  
  for (const match of cpuMatches) {
    result.cpu.push({
      timestamp: "",
      us: parseFloat(match[1]),
      sy: parseFloat(match[2]),
      ni: parseFloat(match[3]),
      id: parseFloat(match[4]),
      wa: parseFloat(match[5]),
      hi: parseFloat(match[6]),
      si: parseFloat(match[7]),
    });
  }

  // Parse memory
  const memMatches = content.matchAll(/MiB Mem\s*:\s*(\d+\.?\d*)\s*total,\s*(\d+\.?\d*)\s*free,\s*(\d+\.?\d*)\s*used/g);
  
  for (const match of memMatches) {
    result.memory.push({
      timestamp: "",
      total: parseFloat(match[1]),
      free: parseFloat(match[2]),
      used: parseFloat(match[3]),
    });
  }

  // Parse top processes
  const processMatches = content.matchAll(/^\s*(\d+)\s+\S+\s+\d+\s+\d+\s+\S+\s+\S+\s+\S+\s+\S+\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+\S+\s+(.+)$/gm);
  
  const processMap = new Map<string, { pid: number; cpu: number; mem: number }>();
  
  for (const match of processMatches) {
    const name = match[4].trim();
    const cpu = parseFloat(match[2]);
    const mem = parseFloat(match[3]);
    
    const existing = processMap.get(name);
    if (!existing || existing.cpu < cpu) {
      processMap.set(name, { pid: parseInt(match[1], 10), cpu, mem });
    }
  }
  
  result.topProcesses = Array.from(processMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.cpu - a.cpu)
    .slice(0, 20);

  return result;
}

/**
 * Parse le fichier dp-monitor.log pour les métriques Data Plane
 */
export function parseDPMonitorLog(content: string): {
  cpuPerCore: { core: number; avg: number; max: number }[];
  sessionUtilization: number[];
  packetBuffer: number[];
  packetDescriptor: number[];
} {
  const result = {
    cpuPerCore: [] as any[],
    sessionUtilization: [] as number[],
    packetBuffer: [] as number[],
    packetDescriptor: [] as number[],
  };

  // Parse CPU per core from the resource monitoring section
  const coreSection = content.match(/:CPU load \(%\) during last 15 minutes:[\s\S]*?(?=:Resource utilization|$)/);
  
  if (coreSection) {
    const lines = coreSection[0].split("\n");
    let coreOffset = 0;
    
    for (const line of lines) {
      // Header line like ":core    0       1       2       3"
      const headerMatch = line.match(/:core\s+([\d\s]+)/);
      if (headerMatch) {
        const cores = headerMatch[1].trim().split(/\s+/).map(Number);
        coreOffset = cores[0];
        continue;
      }
      
      // Data line like ":     avg max avg max avg max"
      // Values line like ":       0   0  19  24  17  22"
      const valuesMatch = line.match(/:\s+([\d\s]+)/);
      if (valuesMatch && !line.includes("avg")) {
        const values = valuesMatch[1].trim().split(/\s+/).map(Number);
        
        // Values are pairs of avg, max
        for (let i = 0; i < values.length; i += 2) {
          const core = coreOffset + (i / 2);
          const existing = result.cpuPerCore.find(c => c.core === core);
          
          if (!existing) {
            result.cpuPerCore.push({
              core,
              avg: values[i],
              max: values[i + 1] || values[i],
            });
          }
        }
      }
    }
  }

  // Parse session utilization
  const sessionMatch = content.match(/:session \(average\):[\s\S]*?:\s+([\d\s]+)/);
  if (sessionMatch) {
    result.sessionUtilization = sessionMatch[1].trim().split(/\s+/).map(Number);
  }

  // Parse packet buffer
  const bufferMatch = content.match(/:packet buffer \(average\):[\s\S]*?:\s+([\d\s]+)/);
  if (bufferMatch) {
    result.packetBuffer = bufferMatch[1].trim().split(/\s+/).map(Number);
  }

  return result;
}
