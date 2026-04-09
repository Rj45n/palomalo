/**
 * Parser principal pour le fichier techsupport_*.txt
 * Extrait toutes les sections "show" et parse chaque section
 */

import type {
  TSFDataComplete,
  TSFSessionsComplete,
  TSFCountersComplete,
  TSFCounter,
  TSFHAComplete,
  TSFInterfaceComplete,
  TSFRoutingComplete,
  TSFVPNComplete,
  TSFGlobalProtectComplete,
  TSFLicense,
  TSFProcess,
  TSFSoftware,
  TSFResourcesComplete,
  DataPlaneCPUCore,
  DataPlaneCPUGroup,
} from "@/types";

// Regex pour détecter le début d'une section show
const SECTION_REGEX = /^> (show .+)$/m;

/**
 * Divise le contenu du TSF en sections basées sur les commandes "show"
 */
export function splitBySections(content: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = content.split("\n");
  let currentCommand = "";
  let currentContent: string[] = [];

  for (const line of lines) {
    const match = line.match(/^> (show .+)$/);
    if (match) {
      // Sauvegarder la section précédente
      if (currentCommand && currentContent.length > 0) {
        sections.set(currentCommand, currentContent.join("\n"));
      }
      currentCommand = match[1].trim();
      currentContent = [];
    } else if (currentCommand) {
      currentContent.push(line);
    }
  }

  // Sauvegarder la dernière section
  if (currentCommand && currentContent.length > 0) {
    sections.set(currentCommand, currentContent.join("\n"));
  }

  return sections;
}

/**
 * Parse "show system info"
 */
export function parseSystemInfo(
  content: string
): Partial<TSFDataComplete["system"]> {
  const result: Partial<TSFDataComplete["system"]> = {};

  const patterns: Record<string, keyof TSFDataComplete["system"]> = {
    hostname: "hostname",
    model: "model",
    serial: "serial",
    "sw-version": "panosVersion",
    uptime: "uptime",
    "multi-vsys": "multiVsys",
    "operational-mode": "operationalMode",
    "ip-address": "managementIp",
    "default-gateway": "defaultGateway",
  };

  for (const line of content.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();

      if (patterns[key]) {
        const fieldName = patterns[key];
        if (fieldName === "multiVsys") {
          (result as any)[fieldName] = value === "on" || value === "yes";
        } else {
          (result as any)[fieldName] = value;
        }
      }
    }
  }

  // Calculer uptimeSeconds si possible
  if (result.uptime) {
    result.uptimeSeconds = parseUptimeToSeconds(result.uptime);
  }

  return result;
}

/**
 * Convertit une chaîne d'uptime en secondes
 */
function parseUptimeToSeconds(uptime: string): number {
  let seconds = 0;
  const daysMatch = uptime.match(/(\d+)\s*days?/);
  const hoursMatch = uptime.match(/(\d+):(\d+):(\d+)/);

  if (daysMatch) {
    seconds += parseInt(daysMatch[1]) * 86400;
  }
  if (hoursMatch) {
    seconds += parseInt(hoursMatch[1]) * 3600;
    seconds += parseInt(hoursMatch[2]) * 60;
    seconds += parseInt(hoursMatch[3]);
  }

  return seconds;
}

/**
 * Parse "show session info"
 */
export function parseSessionInfo(content: string): Partial<TSFSessionsComplete> {
  const result: Partial<TSFSessionsComplete> = {};

  const patterns: Record<string, keyof TSFSessionsComplete> = {
    "Number of sessions supported": "supported",
    "Number of allocated sessions": "allocated",
    "Number of active TCP sessions": "tcp",
    "Number of active UDP sessions": "udp",
    "Number of active ICMP sessions": "icmp",
    "Number of active predict sessions": "pending",
    "Session table utilization": "utilization",
    "Packet rate": "packetRate",
    Throughput: "throughputKbps",
    "New connection establish rate": "newConnectionRate",
  };

  for (const line of content.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const valueStr = line.substring(colonIndex + 1).trim();

      if (patterns[key]) {
        const fieldName = patterns[key];
        // Extraire le nombre
        const numMatch = valueStr.match(/^(\d+)/);
        if (numMatch) {
          (result as any)[fieldName] = parseInt(numMatch[1]);
        }
      }
    }
  }

  // Calculer actif et autres
  if (result.tcp !== undefined && result.udp !== undefined) {
    result.active =
      (result.tcp || 0) + (result.udp || 0) + (result.icmp || 0);
    result.other =
      (result.allocated || 0) -
      (result.tcp || 0) -
      (result.udp || 0) -
      (result.icmp || 0);
  }

  return result;
}

/**
 * Parse "show counter global" ou "show counter global filter delta yes"
 */
export function parseCounterGlobal(
  content: string,
  isDelta: boolean = false
): TSFCountersComplete {
  const result: TSFCountersComplete = {
    drops: [],
    warnings: [],
    hardware: [],
    top30: [],
    totalDrops: 0,
    criticalCount: 0,
  };

  const lines = content.split("\n");
  let dataStarted = false;

  for (const line of lines) {
    // Skip header lines
    if (line.includes("name") && line.includes("value") && line.includes("severity")) {
      dataStarted = true;
      continue;
    }
    if (line.startsWith("---") || !dataStarted) continue;
    if (line.trim() === "") continue;

    // Parse counter line
    // Format: name                                   value     rate severity  category  aspect    description
    const parts = line.trim().split(/\s{2,}/);
    if (parts.length >= 6) {
      const name = parts[0];
      const value = parseInt(parts[1]) || 0;
      const rate = parseInt(parts[2]) || 0;
      const rawSeverity = parts[3];
      const category = parts[4];
      const aspect = parts[5];
      const description = parts.slice(6).join(" ");

      // Mapper les sévérités PAN-OS vers notre type
      const mapSeverity = (s: string): "critical" | "major" | "warning" | "info" => {
        if (s === "critical") return "critical";
        if (s === "major") return "major";
        if (s === "warn" || s === "warning") return "warning";
        return "info";
      };

      const severity = mapSeverity(rawSeverity);
      const isDrop = rawSeverity === "drop" || name.includes("drop") || name.includes("discard");
      const isWarn = rawSeverity === "warn" || rawSeverity === "warning";

      const counter: TSFCounter = {
        name,
        value,
        rate,
        severity: isDrop ? "critical" : severity,
        category,
        description,
        aspect,
      };

      // Classifier les compteurs
      if (isDrop) {
        result.drops.push(counter);
        result.totalDrops += value;
      } else if (isWarn) {
        result.warnings.push(counter);
      } else if (category === "hardware" || aspect === "hardware") {
        result.hardware.push(counter);
      }

      // Top 30 par valeur
      result.top30.push(counter);
    }
  }

  // Trier top30 par valeur décroissante et limiter à 30
  result.top30.sort((a, b) => b.value - a.value);
  result.top30 = result.top30.slice(0, 30);

  // Trier les drops par valeur
  result.drops.sort((a, b) => b.value - a.value);

  // Compter les critiques
  result.criticalCount = result.drops.filter(
    (d) => d.severity === "critical" || d.value > 10000
  ).length;

  return result;
}

/**
 * Parse "show high-availability all"
 */
export function parseHAAll(content: string): TSFHAComplete {
  const result: TSFHAComplete = {
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
  };

  if (!content || content.trim() === "") {
    return result;
  }

  result.enabled = true;

  // Parse mode
  const modeMatch = content.match(/Mode:\s*(Active-Passive|Active-Active)/i);
  if (modeMatch) {
    result.mode = modeMatch[1].toLowerCase() as "active-passive" | "active-active";
  }

  // Parse local state
  const localStateMatch = content.match(/State:\s*(\w+)\s*\(last\s+([^)]+)\)/);
  if (localStateMatch) {
    result.localState = localStateMatch[1];
    result.lastFailover = localStateMatch[2];
  }

  // Parse peer state
  const peerSection = content.indexOf("Peer Information:");
  if (peerSection > 0) {
    const peerContent = content.substring(peerSection);
    const peerStateMatch = peerContent.match(/State:\s*(\w+)/);
    if (peerStateMatch) {
      result.peerState = peerStateMatch[1];
    }
    const peerConnMatch = peerContent.match(/Connection status:\s*(\w+)/);
    if (peerConnMatch && peerConnMatch[1] !== "up") {
      result.peerState = "disconnected";
    }
    const peerIpMatch = peerContent.match(/Management IPv4 Address:\s*([^\s/]+)/);
    if (peerIpMatch) {
      result.peerAddress = peerIpMatch[1];
    }
  }

  // Parse HA1 link
  const ha1Match = content.match(/HA1 Control Link Information[\s\S]*?Link State:\s*(\w+)/);
  if (ha1Match) {
    result.links.ha1.status = ha1Match[1].toLowerCase();
  }
  const ha1IpMatch = content.match(/HA1 Control Link Information[\s\S]*?IP Address:\s*([^\s/]+)/);
  if (ha1IpMatch) {
    result.links.ha1.ip = ha1IpMatch[1];
  }

  // Parse HA1 Backup
  const ha1bMatch = content.match(/HA1 Backup Control Link[\s\S]*?Link State:\s*(\w+)/);
  if (ha1bMatch) {
    result.links.ha1Backup = { status: ha1bMatch[1].toLowerCase() };
  }

  // Parse HA2 link
  const ha2Match = content.match(/HA2 Data Link Information[\s\S]*?Link State:\s*(\w+)/);
  if (ha2Match) {
    result.links.ha2.status = ha2Match[1].toLowerCase();
  }

  // Parse priority
  const priorityMatch = content.match(/Priority:\s*(\d+)/);
  if (priorityMatch) {
    result.localPriority = parseInt(priorityMatch[1]);
  }

  // Parse preemptive
  const preemptMatch = content.match(/Preemptive:\s*(\w+)/);
  if (preemptMatch) {
    result.preemptive = preemptMatch[1].toLowerCase() === "yes";
  }

  // Parse sync status
  const syncMatch = content.match(/State Synchronization:\s*(\w+)/);
  if (syncMatch) {
    result.configSync = syncMatch[1];
    result.runningSync = syncMatch[1].toLowerCase() === "complete";
    result.runningSyncEnabled = true;
  }

  // Parse intervals
  const promoMatch = content.match(/Promotion Hold Interval:\s*(\d+)/);
  if (promoMatch) {
    result.promotionHold = parseInt(promoMatch[1]);
  }
  const helloMatch = content.match(/Hello Message Interval:\s*(\d+)/);
  if (helloMatch) {
    result.helloInterval = parseInt(helloMatch[1]);
  }
  const heartMatch = content.match(/Heartbeat Ping Interval:\s*(\d+)/);
  if (heartMatch) {
    result.heartbeatInterval = parseInt(heartMatch[1]);
  }

  return result;
}

/**
 * Parse "show interface all"
 */
export function parseInterfaceAll(content: string): TSFInterfaceComplete[] {
  const interfaces: TSFInterfaceComplete[] = [];
  const lines = content.split("\n");
  let dataStarted = false;

  for (const line of lines) {
    if (line.includes("name") && line.includes("speed/duplex/state")) {
      dataStarted = true;
      continue;
    }
    if (line.startsWith("---") || !dataStarted) continue;
    if (line.trim() === "") continue;

    // Format: name                    id    speed/duplex/state            mac address
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 4) {
      const name = parts[0];
      // parts[1] is id
      const speedDuplexState = parts[2];
      const macAddress = parts[3];

      // Parse speed/duplex/state
      const sdsMatch = speedDuplexState.match(/(\d+|ukn|\[n\/a\])\/(\w+|\[n\/a\])\/(\w+)/);
      let speed = "unknown";
      let duplex = "unknown";
      let status: "up" | "down" | "unknown" = "unknown";

      if (sdsMatch) {
        speed = sdsMatch[1] === "ukn" ? "unknown" : sdsMatch[1];
        duplex = sdsMatch[2];
        status = sdsMatch[3].toLowerCase().includes("up") ? "up" : "down";
      }

      // Déterminer le type d'interface
      let type: TSFInterfaceComplete["type"] = "other";
      if (name.startsWith("ethernet")) type = "ethernet";
      else if (name.startsWith("loopback")) type = "loopback";
      else if (name.startsWith("tunnel")) type = "tunnel";
      else if (name.startsWith("vlan")) type = "vlan";
      else if (name.startsWith("ae")) type = "aggregate";

      interfaces.push({
        name,
        type,
        status,
        macAddress,
        speed: speed !== "unknown" ? `${speed}Mb/s` : undefined,
        duplex: duplex !== "[n/a]" ? duplex : undefined,
        rxBytes: 0,
        txBytes: 0,
        rxPackets: 0,
        txPackets: 0,
        rxErrors: 0,
        txErrors: 0,
        rxDrops: 0,
        txDrops: 0,
      });
    }
  }

  return interfaces;
}

/**
 * Parse "show system disk-space"
 */
export function parseDiskSpace(
  content: string
): TSFResourcesComplete["disk"]["partitions"] {
  const partitions: TSFResourcesComplete["disk"]["partitions"] = [];
  const lines = content.split("\n");
  let dataStarted = false;

  for (const line of lines) {
    if (line.includes("Filesystem") && line.includes("Size")) {
      dataStarted = true;
      continue;
    }
    if (!dataStarted) continue;
    if (line.trim() === "") continue;

    // Format: /dev/md3         38G   11G   26G  30% /
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 6) {
      const usageMatch = parts[4].match(/(\d+)%/);
      partitions.push({
        name: parts[0],
        size: parts[1],
        used: parts[2],
        available: parts[3],
        usagePercent: usageMatch ? parseInt(usageMatch[1]) : 0,
        mountPoint: parts[5],
      });
    }
  }

  return partitions;
}

/**
 * Parse "show running resource-monitor"
 */
export function parseResourceMonitor(
  content: string
): Partial<TSFResourcesComplete["dataplane"]> {
  const result: Partial<TSFResourcesComplete["dataplane"]> = {
    cpuByCore: [],
    cpuByGroup: [],
  };

  // Parse CPU by group
  const groupSection = content.match(
    /CPU load sampling by group:([\s\S]*?)(?=CPU load \(|\n\n)/
  );
  if (groupSection) {
    const groupLines = groupSection[1].split("\n");
    for (const line of groupLines) {
      const match = line.match(/^(\w+)\s*:\s*(\d+)%/);
      if (match) {
        result.cpuByGroup!.push({
          name: match[1],
          usage: parseInt(match[2]),
        });
      }
    }
  }

  // Parse CPU by core
  const coreSection = content.match(
    /CPU load \(%\) during last \d+ seconds:([\s\S]*?)(?=\n\n|Resource utilization|$)/
  );
  if (coreSection) {
    const coreLines = coreSection[1].split("\n");
    // First line has core numbers
    const headerLine = coreLines.find((l) => l.includes("core"));
    if (headerLine) {
      const coreIds = headerLine
        .split(/\s+/)
        .filter((s) => !isNaN(parseInt(s)))
        .map((s) => parseInt(s));

      // Following lines have values
      let latestValues: number[] = [];
      for (const line of coreLines) {
        if (line.includes("core")) continue;
        const values = line
          .trim()
          .split(/\s+/)
          .filter((s) => s !== "*" && !isNaN(parseInt(s)))
          .map((s) => parseInt(s));
        if (values.length > 0) {
          latestValues = values;
          break; // Prendre la première ligne de données
        }
      }

      // Créer les cores
      for (let i = 0; i < latestValues.length && i < coreIds.length; i++) {
        result.cpuByCore!.push({
          coreId: coreIds[i],
          usage: latestValues[i],
        });
      }
    }
  }

  // Calculer moyenne CPU
  if (result.cpuByCore && result.cpuByCore.length > 0) {
    const activeCores = result.cpuByCore.filter((c) => c.usage > 0);
    result.cpuAverage =
      activeCores.length > 0
        ? Math.round(
            activeCores.reduce((a, b) => a + b.usage, 0) / activeCores.length
          )
        : 0;
  }

  return result;
}

/**
 * Parse "show vpn ike-sa"
 */
export function parseVPNIkeSa(content: string): TSFVPNComplete["ikeSa"] {
  const ikeSa: TSFVPNComplete["ikeSa"] = [];
  const lines = content.split("\n");
  let section = "";

  for (const line of lines) {
    if (line.includes("IKEv1 phase-1 SAs")) {
      section = "ikev1-phase1";
      continue;
    }
    if (line.includes("IKEv2 SAs")) {
      section = "ikev2";
      continue;
    }
    if (line.startsWith("---") || line.includes("GwID")) continue;
    if (line.trim() === "") continue;

    // Parse IKEv2 SA lines
    // Format varies but typically: gateway info, peer, state, etc.
    const parts = line.trim().split(/\s{2,}/);
    if (parts.length >= 3) {
      const name = parts[0];
      const peer = parts[1] || "";
      // Chercher l'état
      let state = "unknown";
      for (const part of parts) {
        if (
          part.toLowerCase().includes("established") ||
          part.toLowerCase().includes("up")
        ) {
          state = "established";
          break;
        } else if (
          part.toLowerCase().includes("down") ||
          part.toLowerCase().includes("failed")
        ) {
          state = "down";
          break;
        }
      }

      if (name && !name.startsWith("-")) {
        ikeSa.push({
          name,
          peer,
          state,
          phase: section === "ikev1-phase1" ? 1 : 2,
          initiator: false,
          nat: "unknown",
        });
      }
    }
  }

  return ikeSa;
}

/**
 * Parse "show vpn gateway"
 */
export function parseVPNGateway(
  content: string
): TSFVPNComplete["ikeGateways"] {
  const gateways: TSFVPNComplete["ikeGateways"] = [];
  const lines = content.split("\n");
  let dataStarted = false;

  for (const line of lines) {
    if (line.includes("GwID") && line.includes("Name")) {
      dataStarted = true;
      continue;
    }
    if (line.startsWith("---") || !dataStarted) continue;
    if (line.trim() === "") continue;

    // Format: GwID     Name     Peer-Address     Local Address     Protocol     Proposals
    const parts = line.trim().split(/\s{2,}/);
    if (parts.length >= 5) {
      const gwId = parts[0];
      if (isNaN(parseInt(gwId))) continue;

      const name = parts[1];
      const peerFull = parts[2];
      const localFull = parts[3];
      const protocol = parts[4];

      // Extraire l'IP du peer
      const peerMatch = peerFull.match(/([0-9.]+)/);
      const localMatch = localFull.match(/([0-9.]+)/);

      gateways.push({
        name,
        peerAddress: peerMatch ? peerMatch[1] : peerFull,
        localAddress: localMatch ? localMatch[1] : undefined,
        version: protocol.toLowerCase().includes("ikev2") ? "ikev2" : "ikev1",
        authentication: "psk",
        natTraversal: true,
        dpd: { enabled: true },
      });
    }
  }

  return gateways;
}

/**
 * Parse "show vpn tunnel"
 */
export function parseVPNTunnel(
  content: string
): TSFVPNComplete["ipsecTunnels"] {
  const tunnels: TSFVPNComplete["ipsecTunnels"] = [];
  const lines = content.split("\n");
  let dataStarted = false;

  for (const line of lines) {
    if (line.includes("TnID") && line.includes("Name")) {
      dataStarted = true;
      continue;
    }
    if (line.startsWith("---") || !dataStarted) continue;
    if (line.trim() === "") continue;

    const parts = line.trim().split(/\s{2,}/);
    if (parts.length >= 3) {
      const tnId = parts[0];
      if (isNaN(parseInt(tnId))) continue;

      const name = parts[1];
      const gateway = parts[2];

      tunnels.push({
        name,
        gateway,
        status: "configured",
        proxy: [],
      });
    }
  }

  return tunnels;
}

/**
 * Parse "show global-protect-gateway statistics"
 */
export function parseGlobalProtectStats(
  content: string
): Partial<TSFGlobalProtectComplete> {
  const result: Partial<TSFGlobalProtectComplete> = {
    gateways: [],
    users: [],
    statistics: {
      currentUsers: 0,
      previousUsers: 0,
      tunnelEstablishments: 0,
      authSuccesses: 0,
      authFailures: 0,
    },
  };

  // Parse gateway stats
  const gwMatches = content.matchAll(
    /GlobalProtect Gateway:\s*(\S+)[\s\S]*?Current Users:\s*(\d+)[\s\S]*?Previous Users:\s*(\d+)/g
  );
  for (const match of gwMatches) {
    result.gateways!.push({
      name: match[1],
      tunnelMode: "remote",
      totalUsers: parseInt(match[2]) + parseInt(match[3]),
      activeUsers: parseInt(match[2]),
    });
    result.statistics!.currentUsers += parseInt(match[2]);
    result.statistics!.previousUsers += parseInt(match[3]);
  }

  // Parse total
  const totalMatch = content.match(/Total Current Users:\s*(\d+)/);
  if (totalMatch) {
    result.statistics!.currentUsers = parseInt(totalMatch[1]);
  }

  return result;
}

/**
 * Parse "show system software status"
 */
export function parseSoftwareStatus(content: string): TSFProcess[] {
  const processes: TSFProcess[] = [];
  const lines = content.split("\n");
  let currentSlot = "";

  for (const line of lines) {
    // Detect slot
    const slotMatch = line.match(/^Slot\s+(\d+),\s+Role\s+(\w+)/);
    if (slotMatch) {
      currentSlot = `${slotMatch[1]}-${slotMatch[2]}`;
      continue;
    }

    // Parse process line
    const procMatch = line.match(
      /^Process\s+(\S+)\s+(running|stopped|blocked)\s*\(pid:\s*(\d+)\)/
    );
    if (procMatch) {
      processes.push({
        pid: parseInt(procMatch[3]),
        name: procMatch[1],
        cpu: 0, // Non disponible dans show software status
        memory: 0,
        memoryKb: 0,
        state: procMatch[2],
        user: currentSlot,
      });
    }
  }

  return processes;
}

/**
 * Parse "show system license"
 */
export function parseLicenses(content: string): TSFLicense[] {
  const licenses: TSFLicense[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    // Format varies, look for common patterns
    // Feature: xxx, Expires: xxx
    const featureMatch = line.match(/^(\w[\w\s-]+):\s*(\S+)/);
    if (featureMatch) {
      const feature = featureMatch[1].trim();
      const value = featureMatch[2].trim();

      // Skip non-license lines
      if (
        feature.toLowerCase().includes("license") ||
        feature.toLowerCase().includes("threat") ||
        feature.toLowerCase().includes("url") ||
        feature.toLowerCase().includes("wildfire") ||
        feature.toLowerCase().includes("globalprotect")
      ) {
        licenses.push({
          feature,
          expires: value,
          expired: value.toLowerCase() === "expired",
        });
      }
    }
  }

  return licenses;
}

/**
 * Parse le fichier techsupport_*.txt complet et retourne les données structurées
 */
export function parseTechSupportMain(content: string): Partial<TSFDataComplete> {
  const sections = splitBySections(content);
  const data: Partial<TSFDataComplete> = {
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
    interfaces: [],
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
    processes: [],
    issues: [],
    healthScore: 100,
  };

  // Parcourir les sections et parser
  for (const [command, sectionContent] of sections) {
    try {
      if (command === "show system info") {
        Object.assign(data.system!, parseSystemInfo(sectionContent));
      } else if (command === "show session info") {
        Object.assign(data.sessions!, parseSessionInfo(sectionContent));
      } else if (command === "show counter global") {
        data.counters = parseCounterGlobal(sectionContent, false);
      } else if (command === "show counter global filter delta yes") {
        // Compléter avec les drops delta
        const deltaCounters = parseCounterGlobal(sectionContent, true);
        // Garder les drops avec rate > 0
        data.counters!.drops = deltaCounters.drops.filter((d) => d.rate > 0);
      } else if (command === "show high-availability all") {
        data.ha = parseHAAll(sectionContent);
      } else if (command === "show interface all") {
        data.interfaces = parseInterfaceAll(sectionContent);
      } else if (command === "show system disk-space") {
        data.resources!.disk.partitions = parseDiskSpace(sectionContent);
      } else if (command === "show running resource-monitor") {
        const dpData = parseResourceMonitor(sectionContent);
        Object.assign(data.resources!.dataplane, dpData);
        // Mettre à jour session utilization
        if (data.sessions?.utilization) {
          data.resources!.dataplane.sessionUtilization = data.sessions.utilization;
        }
      } else if (command === "show vpn gateway") {
        data.vpn!.ikeGateways = parseVPNGateway(sectionContent);
      } else if (command === "show vpn tunnel") {
        data.vpn!.ipsecTunnels = parseVPNTunnel(sectionContent);
      } else if (command === "show vpn ike-sa") {
        data.vpn!.ikeSa = parseVPNIkeSa(sectionContent);
      } else if (
        command === "show global-protect-gateway statistics" ||
        command === "show global-protect-gateway gateway"
      ) {
        const gpData = parseGlobalProtectStats(sectionContent);
        Object.assign(data.globalProtect!, gpData);
      } else if (command === "show system software status") {
        data.processes = parseSoftwareStatus(sectionContent);
      }
    } catch (error) {
      console.error(`Error parsing section "${command}":`, error);
    }
  }

  return data;
}

export default parseTechSupportMain;
