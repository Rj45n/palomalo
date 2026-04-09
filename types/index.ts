// Types pour les requêtes de connexion
export interface ConnectRequest {
  url: string;
  username: string;
  password: string;
}

export interface ConnectResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// Types pour les réponses PAN-OS XML
export interface PanOSKeygenResponse {
  response: {
    $: {
      status: string;
    };
    result?: {
      key: string[];
    };
    msg?: string[];
  };
}

// Types pour les métriques système
export interface SystemResources {
  cpu: number;
  memory: number;
  disk: number;
  uptime: string;
}

export interface SessionInfo {
  total: number;
  active: number;
  tcp: number;
  udp: number;
  icmp: number;
}

export interface InterfaceStats {
  name: string;
  status: "up" | "down" | "configured" | "unknown";
  speed: string;
  duplex?: string;
  rx: number;
  tx: number;
  rxPackets: number;
  txPackets: number;
  rxErrors: number;
  txErrors: number;
  rxDrops: number;
  txDrops: number;
  utilization?: number;
  lastChange?: string;
}

export interface InterfaceIssue {
  interface: string;
  severity: "critical" | "warning" | "info";
  type: "down" | "errors" | "drops" | "high-utilization";
  message: string;
  recommendation: string;
  cliCommand?: string;
}

export interface DiagnosticIssue {
  id: string;
  category: "system" | "network" | "security" | "performance" | "ha" | "license";
  severity: "critical" | "major" | "warning" | "info";
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  cliCommands?: string[];
  affectedComponents?: string[];
  detectedAt: string;
  source: "live" | "tsf" | "combined";
}

export interface SystemInfo {
  hostname: string;
  serial: string;
  model: string;
  version: string;
  uptime: string;
}

// Types pour le dashboard
export interface DashboardMetrics {
  system: SystemResources;
  sessions: SessionInfo;
  interfaces: InterfaceStats[];
  info: SystemInfo;
  interfaceIssues?: InterfaceIssue[];
}

// Types pour Tech Support File (TSF)
export interface TSFData {
  metadata: {
    filename: string;
    uploadedAt: string;
    size: number;
  };
  system: {
    hostname: string;
    model: string;
    serial: string;
    version: string;
    uptime: string;
    lastReboot?: string;
  };
  hardware: {
    cpu: string;
    memory: string;
    disk: string;
    temperature?: Record<string, number>;
  };
  processes: Array<{
    pid: string;
    name: string;
    cpu: number;
    memory: number;
  }>;
  logs: {
    critical: string[];
    errors: string[];
    warnings: string[];
  };
  ha?: {
    enabled: boolean;
    state: string;
    peer?: string;
    syncStatus?: string;
  };
  licenses: Array<{
    feature: string;
    expires: string;
    status: string;
  }>;
  interfaces: InterfaceStats[];
  sessions: {
    max: number;
    current: number;
    history: Array<{ time: string; count: number }>;
  };
}

export interface TSFAnalysisResult {
  tsfData: TSFData;
  issues: DiagnosticIssue[];
  recommendations: string[];
  healthScore: number;
}

// Types avancés pour métriques TAC-level
export interface AdvancedMetrics {
  resourceMonitor: {
    dataplane: { core: number; usage: number }[];
    packetDescriptor: number;
    sessionUtilization: number;
    bufferUtilization: number;
  };
  counters: {
    drops: { name: string; count: number; severity: string; reason: string }[];
    warnings: { name: string; count: number }[];
  };
  ha: {
    enabled: boolean;
    localState: string;
    peerState: string;
    syncStatus: string;
    lastFailover?: string;
  };
  routing: {
    totalRoutes: number;
    bgpPeers: { peer: string; state: string; prefixes: number }[];
    ospfNeighbors: { neighbor: string; state: string }[];
  };
  vpn: {
    ikeSa: { name: string; peer: string; state: string }[];
    ipsecSa: { name: string; spi: string; encapPackets: number }[];
  };
  globalProtect?: {
    connectedUsers: number;
    users: { username: string; ip: string; loginTime: string }[];
  };
}

// Types pour analyse TSF approfondie
export interface TSFAnalysisDeep extends TSFData {
  crashes: {
    timestamp: string;
    process: string;
    backtrace: string;
    possibleCause: string;
  }[];
  history: {
    cpuTrend: { time: string; value: number }[];
    memoryTrend: { time: string; value: number }[];
    sessionTrend: { time: string; value: number }[];
  };
  configIssues: {
    type: string;
    description: string;
    location: string;
  }[];
  knownIssues: {
    pattern: string;
    matches: string[];
    kbArticle?: string;
  }[];
}

// Type pour corrélation live + TSF
export interface CorrelatedIssue extends DiagnosticIssue {
  trend?: "increasing" | "stable" | "decreasing";
  firstSeen?: string;
  recurrence?: number;
  tsfContext?: string;
}

// ============================================================
// Types pour parsing complet des Tech Support Files (TSF)
// ============================================================

// CPU par core Data Plane
export interface DataPlaneCPUCore {
  coreId: number;
  usage: number;
  group?: string;
}

// CPU par groupe fonctionnel Data Plane
export interface DataPlaneCPUGroup {
  name: string;
  usage: number;
}

// Ressources système complètes
export interface TSFResourcesComplete {
  management: {
    cpu: number;
    memory: number;
    memoryTotal: number;
    memoryUsed: number;
    loadAverage: [number, number, number];
    swapUsed: number;
    swapTotal: number;
  };
  dataplane: {
    cpuAverage: number;
    cpuByCore: DataPlaneCPUCore[];
    cpuByGroup: DataPlaneCPUGroup[];
    packetBufferUsage: number;
    packetDescriptorUsage: number;
    sessionUtilization: number;
  };
  disk: {
    partitions: {
      name: string;
      size: string;
      used: string;
      available: string;
      usagePercent: number;
      mountPoint: string;
    }[];
    logdbQuota?: {
      traffic: number;
      threat: number;
      system: number;
      config: number;
      appstats: number;
    };
  };
}

// Sessions détaillées
export interface TSFSessionsComplete {
  supported: number;
  allocated: number;
  pending: number;
  active: number;
  tcp: number;
  udp: number;
  icmp: number;
  other: number;
  utilization: number;
  packetRate: number;
  throughputKbps: number;
  newConnectionRate: number;
  tcpHalfOpen: number;
  icmpUnreachable: number;
  timeouts: {
    tcp: number;
    udp: number;
    icmp: number;
    other: number;
  };
  byVsys?: {
    vsys: string;
    sessions: number;
    maxSessions: number;
  }[];
}

// Compteur/Drop individuel
export interface TSFCounter {
  name: string;
  value: number;
  rate: number;
  severity: "critical" | "major" | "warning" | "info";
  category: string;
  description: string;
  aspect?: string;
}

// Compteurs complets
export interface TSFCountersComplete {
  drops: TSFCounter[];
  warnings: TSFCounter[];
  hardware: TSFCounter[];
  top30: TSFCounter[];
  totalDrops: number;
  criticalCount: number;
}

// État HA complet
export interface TSFHAComplete {
  enabled: boolean;
  mode: "active-passive" | "active-active" | "disabled";
  localState: string;
  localPriority: number;
  peerState: string;
  peerSerial?: string;
  peerAddress?: string;
  runningSync: boolean;
  runningSyncEnabled: boolean;
  configSync: string;
  links: {
    ha1: { status: string; ip?: string };
    ha1Backup?: { status: string; ip?: string };
    ha2: { status: string; ip?: string };
    ha2Backup?: { status: string; ip?: string };
    ha3?: { status: string };
  };
  lastFailover?: string;
  lastFailoverReason?: string;
  preemptive: boolean;
  promotionHold: number;
  helloInterval: number;
  heartbeatInterval: number;
}

// Interface réseau complète
export interface TSFInterfaceComplete {
  name: string;
  type: "ethernet" | "loopback" | "tunnel" | "vlan" | "aggregate" | "other";
  status: "up" | "down" | "unknown";
  zone?: string;
  vsys?: string;
  ipAddress?: string;
  netmask?: string;
  macAddress?: string;
  speed?: string;
  duplex?: string;
  mtu?: number;
  rxBytes: number;
  txBytes: number;
  rxPackets: number;
  txPackets: number;
  rxErrors: number;
  txErrors: number;
  rxDrops: number;
  txDrops: number;
  rxCrcErrors?: number;
  txCollisions?: number;
}

// Routing complet
export interface TSFRoutingComplete {
  totalRoutes: number;
  virtualRouters: {
    name: string;
    routes: number;
    interfaces: string[];
  }[];
  bgp: {
    routerId?: string;
    localAs?: number;
    peers: {
      peer: string;
      remoteAs: number;
      state: string;
      uptime?: string;
      prefixesReceived: number;
      prefixesSent: number;
      lastError?: string;
    }[];
  };
  ospf: {
    routerId?: string;
    neighbors: {
      neighbor: string;
      address: string;
      state: string;
      priority: number;
      deadTime?: string;
    }[];
    areas: number;
    lsaCount: number;
  };
  staticRoutes: {
    destination: string;
    nextHop: string;
    interface?: string;
    metric: number;
    flags: string;
  }[];
}

// VPN complet
export interface TSFVPNComplete {
  ikeGateways: {
    name: string;
    peerAddress: string;
    localAddress?: string;
    version: "ikev1" | "ikev2";
    authentication: string;
    natTraversal: boolean;
    dpd: { enabled: boolean; interval?: number };
  }[];
  ipsecTunnels: {
    name: string;
    gateway: string;
    status: string;
    proxy: { local: string; remote: string }[];
    encryption?: string;
    authentication?: string;
  }[];
  ikeSa: {
    name: string;
    peer: string;
    state: string;
    phase: number;
    initiator: boolean;
    nat: string;
    lifetime?: number;
    created?: string;
  }[];
  ipsecSa: {
    name: string;
    spi: string;
    encapsulation: string;
    encryption?: string;
    authentication?: string;
    encapPackets: number;
    decapPackets: number;
    encapBytes: number;
    decapBytes: number;
    lifeRemaining?: number;
  }[];
}

// GlobalProtect complet
export interface TSFGlobalProtectComplete {
  gateways: {
    name: string;
    tunnelMode: string;
    totalUsers: number;
    activeUsers: number;
  }[];
  portals: {
    name: string;
    address: string;
  }[];
  users: {
    username: string;
    domain?: string;
    computer?: string;
    clientIp: string;
    virtualIp?: string;
    publicIp?: string;
    gateway: string;
    loginTime: string;
    clientVersion?: string;
    os?: string;
  }[];
  statistics: {
    currentUsers: number;
    previousUsers: number;
    tunnelEstablishments: number;
    authSuccesses: number;
    authFailures: number;
  };
}

// Licence
export interface TSFLicense {
  feature: string;
  description?: string;
  issued?: string;
  expires: string;
  expired: boolean;
  daysRemaining?: number;
  authCode?: string;
}

// Entry de log
export interface TSFLogEntry {
  timestamp: string;
  severity: "critical" | "high" | "medium" | "low" | "informational";
  type: string;
  subtype?: string;
  description: string;
  object?: string;
  source?: string;
  destination?: string;
  eventId?: string;
}

// Processus
export interface TSFProcess {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  memoryKb: number;
  state: string;
  priority?: number;
  threads?: number;
  user?: string;
  command?: string;
}

// Software/Versions
export interface TSFSoftware {
  panosVersion: string;
  appIdVersion?: string;
  threatVersion?: string;
  antivirusVersion?: string;
  wildfireVersion?: string;
  urlDbVersion?: string;
  globalProtectVersion?: string;
  deviceCertificate?: {
    issuer: string;
    expires: string;
    status: string;
  };
}

// Historique (trends)
export interface TSFHistory {
  cpuManagement: { time: string; value: number }[];
  cpuDataplane: { time: string; value: number }[];
  memory: { time: string; value: number }[];
  sessions: { time: string; value: number }[];
  throughput: { time: string; rxKbps: number; txKbps: number }[];
}

// Issue détectée dans le TSF
export interface TSFIssue {
  id: string;
  severity: "critical" | "major" | "warning" | "info";
  category: "cpu" | "memory" | "sessions" | "drops" | "interfaces" | "ha" | "vpn" | "gp" | "routing" | "license" | "logs" | "config" | "crashes";
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  evidence: string;
  timestamp?: string;
  affectedComponent?: string;
  kbArticle?: string;
}

// Structure TSF complète pour parsing TAC-level
export interface TSFDataComplete {
  metadata: {
    filename: string;
    uploadedAt: string;
    size: number;
    generatedAt?: string;
    parseTime?: number;
  };
  system: {
    hostname: string;
    model: string;
    serial: string;
    panosVersion: string;
    uptime: string;
    uptimeSeconds?: number;
    multiVsys: boolean;
    operationalMode: string;
    lastReboot?: string;
    lastCommit?: string;
    managementIp?: string;
    defaultGateway?: string;
  };
  resources: TSFResourcesComplete;
  sessions: TSFSessionsComplete;
  counters: TSFCountersComplete;
  ha: TSFHAComplete;
  interfaces: TSFInterfaceComplete[];
  routing: TSFRoutingComplete;
  vpn: TSFVPNComplete;
  globalProtect: TSFGlobalProtectComplete;
  licenses: TSFLicense[];
  logs: {
    system: TSFLogEntry[];
    config: TSFLogEntry[];
    alarm: TSFLogEntry[];
    globalProtect: TSFLogEntry[];
    traffic?: TSFLogEntry[];
    threat?: TSFLogEntry[];
  };
  processes: TSFProcess[];
  software: TSFSoftware;
  history: TSFHistory;
  config: {
    zonesCount: number;
    interfacesCount: number;
    securityRulesCount: number;
    natRulesCount: number;
    pbfRulesCount: number;
    qosRulesCount: number;
    addressObjectsCount: number;
    serviceObjectsCount: number;
    applicationFiltersCount: number;
    decryptionRulesCount?: number;
    authenticationRulesCount?: number;
  };
  issues: TSFIssue[];
  healthScore: number;
}

// Résultat d'analyse TSF complète
export interface TSFAnalysisComplete {
  data: TSFDataComplete;
  issues: TSFIssue[];
  healthScore: number;
  criticalIssues: number;
  majorIssues: number;
  warningIssues: number;
  infoIssues: number;
  recommendations: string[];
  parseErrors?: string[];
}

// ─── Historique des diagnostics ───────────────────────────────────────────────

export interface DiagnosticRecord {
  id: string;
  timestamp: string;
  hostname: string;
  model: string;
  version: string;
  healthScore: number;
  issueCount: { critical: number; major: number; warning: number; info: number };
  issues: Array<{
    id: string;
    severity: "critical" | "major" | "warning" | "info";
    category: string;
    title: string;
    description: string;
    recommendation: string;
  }>;
  metrics: {
    dpCpuAvg: number;
    dpCpuMax: number;
    mpCpu: number;
    memoryPct: number;
    sessionUtilPct: number;
    packetRate: number;
    totalDrops: number;
  };
  durationMs: number;
}

// ─── Configuration des alertes ────────────────────────────────────────────────

export interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  condition: "gt" | "lt" | "eq";
  metric: "dpCpuAvg" | "dpCpuMax" | "mpCpu" | "memoryPct" | "sessionUtilPct" | "totalDrops" | "healthScore";
  threshold: number;
  severity: "critical" | "major" | "warning";
  cooldownMinutes: number;
  lastFiredAt?: string;
}

export interface AlertConfig {
  webhookUrl?: string;
  webhookEnabled: boolean;
  emailTo?: string;
  emailFrom?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  emailEnabled: boolean;
  rules: AlertRule[];
}
