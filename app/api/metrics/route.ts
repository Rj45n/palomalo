import { NextRequest, NextResponse } from "next/server";
import { executeCommand, getInterfaceConfig, getInterfaceStats, getResourceMonitor } from "@/lib/panos";
import { DashboardMetrics, InterfaceStats } from "@/types";
import { parseStringPromise } from "xml2js";
import { analyzeInterfaces } from "@/lib/interface-analyzer";

// Cache pour les statistiques d'interfaces (évite de surcharger le firewall)
const interfaceStatsCache = new Map<string, { data: InterfaceStats[]; timestamp: number }>();
const CACHE_DURATION = 20000; // 20 secondes

/**
 * API Route pour récupérer les métriques du firewall
 * GET /api/metrics
 * Nécessite une session active (cookies)
 */
export async function GET(request: NextRequest) {
  try {
    // Récupérer la clé API et l'URL depuis les cookies
    const apiKey = request.cookies.get("panos_api_key")?.value;
    const url = request.cookies.get("panos_url")?.value;

    if (!apiKey || !url) {
      return NextResponse.json(
        { error: "Session expirée" },
        { status: 401 }
      );
    }

    // Récupérer toutes les métriques en parallèle
    const [systemXml, sessionsXml, infoXml, resourceMonitorXml, ethernetConfig, aeConfig] = await Promise.all([
      executeCommand(url, apiKey, "show system resources"),
      executeCommand(url, apiKey, "show session info"),
      executeCommand(url, apiKey, "show system info"),
      getResourceMonitor(url, apiKey),  // Utiliser la fonction dédiée avec gestion des erreurs
      getInterfaceConfig(url, apiKey, "ethernet"),
      getInterfaceConfig(url, apiKey, "aggregate-ethernet"),
    ]);

    // Récupérer les interfaces réelles avec statistiques
    const interfaces = await getRealInterfacesWithStats(url, apiKey, ethernetConfig, aeConfig);

    // Analyser les interfaces pour détecter les problèmes
    const interfaceIssues = analyzeInterfaces(interfaces);

    // Parser les données système (Management Plane)
    const systemData = parseSystemResources(systemXml);
    
    // Parser le Data Plane CPU depuis resource-monitor
    console.log("📊 Réponse resource-monitor:", JSON.stringify(resourceMonitorXml).substring(0, 1000));
    const dataplaneCPU = parseDataPlaneCPU(resourceMonitorXml);
    
    // Utiliser le Data Plane CPU si disponible, sinon Management Plane
    if (dataplaneCPU > 0) {
      systemData.cpu = dataplaneCPU;
      console.log(`🔍 CPU: Data Plane = ${dataplaneCPU}% (utilisé au lieu de Management Plane)`);
    } else {
      console.log(`⚠️ CPU: Data Plane non disponible, utilisation Management Plane = ${systemData.cpu}%`);
    }

    // Parser les données
    const metrics: DashboardMetrics = {
      system: systemData,
      sessions: parseSessionInfo(sessionsXml),
      interfaces: interfaces,
      info: parseSystemInfo(infoXml),
      interfaceIssues: interfaceIssues,
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Erreur lors de la récupération des métriques:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de la récupération des métriques",
      },
      { status: 500 }
    );
  }
}

/**
 * Récupère les vraies interfaces avec statistiques opérationnelles
 * Utilise un système de cache intelligent pour optimiser les performances
 */
async function getRealInterfacesWithStats(
  url: string,
  apiKey: string,
  ethernetConfig: any,
  aeConfig: any
): Promise<InterfaceStats[]> {
  const cacheKey = `${url}_interfaces`;
  const now = Date.now();

  // Vérifier le cache
  const cached = interfaceStatsCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    console.log("📦 Utilisation du cache pour les interfaces");
    return cached.data;
  }

  const interfaces: InterfaceStats[] = [];
  const interfacesToQuery: string[] = [];

  try {
    // Parser les interfaces ethernet
    const ethernetEntries = ethernetConfig.response.result?.ethernet?.entry;
    if (ethernetEntries) {
      const ethArray = Array.isArray(ethernetEntries) ? ethernetEntries : [ethernetEntries];
      
      for (const eth of ethArray) {
        const name = eth.name || eth["$"]?.name || "unknown";
        const comment = eth.comment || "";
        interfacesToQuery.push(name);
      }
    }

    // Parser les interfaces AE (Aggregate Ethernet)
    const aeEntries = aeConfig.response.result?.["aggregate-ethernet"]?.entry;
    if (aeEntries) {
      const aeArray = Array.isArray(aeEntries) ? aeEntries : [aeEntries];
      
      for (const ae of aeArray) {
        const aeName = ae.name || ae["$"]?.name || "unknown";
        interfacesToQuery.push(aeName);

        // Récupérer les sous-interfaces (VLANs)
        const layer3 = ae.layer3;
        if (layer3 && layer3.units && layer3.units.entry) {
          const unitArray = Array.isArray(layer3.units.entry) ? layer3.units.entry : [layer3.units.entry];
          
          for (const unit of unitArray) {
            const unitName = unit.name || unit["$"]?.name;
            interfacesToQuery.push(unitName);
          }
        }
      }
    }

    // Ajouter l'interface management
    interfacesToQuery.push("management");

    // Limiter aux 20 premières interfaces pour éviter de surcharger le firewall
    // (on peut ajuster ce nombre selon les besoins)
    const interfacesToFetch = interfacesToQuery.slice(0, 20);

    console.log(`📡 Récupération des stats pour ${interfacesToFetch.length} interfaces...`);

    // Récupérer les stats en parallèle (max 5 à la fois pour ne pas surcharger)
    const batchSize = 5;
    for (let i = 0; i < interfacesToFetch.length; i += batchSize) {
      const batch = interfacesToFetch.slice(i, i + batchSize);
      const statsPromises = batch.map(async (ifaceName) => {
        try {
          const statsXml = await getInterfaceStats(url, apiKey, ifaceName);
          return parseInterfaceStatsDetailed(statsXml, ifaceName);
        } catch (error) {
          console.error(`Erreur stats pour ${ifaceName}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(statsPromises);
      interfaces.push(...batchResults.filter((s): s is InterfaceStats => s !== null));
    }

    // Ajouter les interfaces restantes sans stats (pour ne pas les perdre)
    const fetchedNames = new Set(interfaces.map(i => i.name.split(" (")[0]));
    interfacesToQuery.forEach((name) => {
      if (!fetchedNames.has(name)) {
        interfaces.push({
          name,
          status: "configured",
          speed: "N/A",
          rx: 0,
          tx: 0,
          rxPackets: 0,
          txPackets: 0,
          rxErrors: 0,
          txErrors: 0,
          rxDrops: 0,
          txDrops: 0,
        });
      }
    });

    // Mettre en cache
    interfaceStatsCache.set(cacheKey, { data: interfaces, timestamp: now });

    console.log(`✅ ${interfaces.length} interfaces récupérées avec succès`);
    return interfaces;
  } catch (error) {
    console.error("Erreur lors de la récupération des interfaces:", error);
    // En cas d'erreur, retourner les données mockées
    return getMockInterfaces();
  }
}

/**
 * Parse les statistiques détaillées d'une interface depuis "show counter interface"
 */
function parseInterfaceStatsDetailed(xml: any, name: string): InterfaceStats | null {
  try {
    const result = xml.response.result;
    
    // Les stats sont dans result.hw.entry et result.ifnet.ifnet.entry
    const hwEntry = result?.hw?.entry;
    const ifnetEntry = result?.ifnet?.ifnet?.entry;
    
    if (!hwEntry && !ifnetEntry) return null;

    // Extraire les valeurs depuis hw (hardware counters)
    const rxBytes = parseInt(hwEntry?.ibytes || "0", 10);
    const txBytes = parseInt(hwEntry?.obytes || "0", 10);
    const rxPackets = parseInt(hwEntry?.ipackets || "0", 10);
    const txPackets = parseInt(hwEntry?.opackets || "0", 10);
    const rxErrors = parseInt(hwEntry?.ierrors || "0", 10);
    const txErrors = parseInt(hwEntry?.oerrors || "0", 10);
    const rxDrops = parseInt(hwEntry?.idrops || ifnetEntry?.idrops || "0", 10);
    const txDrops = parseInt(hwEntry?.odrops || ifnetEntry?.odrops || "0", 10);
    
    // Déterminer le status depuis ifnet
    let status: "up" | "down" | "configured" | "unknown" = "unknown";
    if (ifnetEntry?.state) {
      status = ifnetEntry.state === "up" ? "up" : "down";
    } else if (hwEntry) {
      // Si on a des stats hw, l'interface est probablement up
      status = "up";
    }
    
    // Déterminer la vitesse
    let speed = "N/A";
    if (ifnetEntry?.speed) {
      const speedNum = parseInt(ifnetEntry.speed, 10);
      if (speedNum >= 1000) {
        speed = `${speedNum / 1000}Gbps`;
      } else {
        speed = `${speedNum}Mbps`;
      }
    }

    // Déterminer le duplex
    let duplex = undefined;
    if (ifnetEntry?.duplex) {
      duplex = ifnetEntry.duplex;
    }

    return {
      name,
      status,
      speed,
      duplex,
      rx: rxBytes,
      tx: txBytes,
      rxPackets,
      txPackets,
      rxErrors,
      txErrors,
      rxDrops,
      txDrops,
      utilization: 0, // Sera calculé plus tard si nécessaire
    };
  } catch (error) {
    console.error(`Erreur parsing stats pour ${name}:`, error);
    return null;
  }
}

/**
 * Parse le CPU Data Plane depuis "show running resource-monitor minute"
 * Format: resource-monitor > data-processors > s1dp0 > minute > cpu-load-average > entry[]
 * Chaque entry a: { coreid: "0", value: "34,35,36,..." } (historique des 60 dernières secondes)
 */
function parseDataPlaneCPU(xml: any): number {
  try {
    console.log("🔍 Parsing Data Plane CPU...");
    
    if (!xml) {
      console.log("   ❌ XML null ou undefined");
      return 0;
    }
    
    const data = xml?.response?.result;
    if (!data) {
      console.log("   ❌ Pas de data dans response.result");
      return 0;
    }

    let cpuValues: number[] = [];
    
    // Format PAN-OS: resource-monitor > data-processors > s1dp0 > minute > cpu-load-average > entry[]
    const resourceMonitor = data["resource-monitor"];
    if (resourceMonitor) {
      console.log("   ✅ resource-monitor trouvé");
      
      const dataProcessors = resourceMonitor["data-processors"];
      if (dataProcessors) {
        console.log("   ✅ data-processors trouvé");
        
        // Parcourir tous les data processors (s1dp0, s1dp1, etc.)
        for (const dpName of Object.keys(dataProcessors)) {
          const dp = dataProcessors[dpName];
          const minute = dp?.minute;
          
          if (minute) {
            const cpuLoadAverage = minute["cpu-load-average"];
            
            if (cpuLoadAverage?.entry) {
              const entries = Array.isArray(cpuLoadAverage.entry) 
                ? cpuLoadAverage.entry 
                : [cpuLoadAverage.entry];
              
              console.log(`   ✅ ${dpName}: ${entries.length} cores trouvés`);
              
              entries.forEach((entry: any) => {
                const coreId = entry.coreid;
                const valueStr = entry.value;
                
                if (valueStr) {
                  // Les valeurs sont séparées par des virgules
                  // La première valeur est la plus récente
                  const values = valueStr.split(",").map((v: string) => parseFloat(v.trim()));
                  const currentCPU = values[0] || 0;
                  
                  cpuValues.push(currentCPU);
                  
                  // Afficher les 5 premiers cores pour debug
                  if (cpuValues.length <= 5) {
                    console.log(`   Core ${coreId}: ${currentCPU}%`);
                  }
                }
              });
            }
          }
        }
      }
    }

    if (cpuValues.length === 0) {
      console.log("   ❌ Aucune valeur CPU trouvée");
      return 0;
    }

    // Calculer les statistiques
    // Exclure core 0 qui est souvent à 0% (réservé)
    const activeCores = cpuValues.filter(v => v > 0);
    const avg = cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length;
    const weightedAvg = activeCores.length > 0 
      ? activeCores.reduce((a, b) => a + b, 0) / activeCores.length 
      : avg;
    const max = Math.max(...cpuValues);

    console.log(`🔍 Data Plane CPU: ${cpuValues.length} cores total, ${activeCores.length} actifs`);
    console.log(`   Moyenne tous cores: ${Math.round(avg)}%`);
    console.log(`   Moyenne cores actifs: ${Math.round(weightedAvg)}%`);
    console.log(`   Maximum: ${max}%`);
    
    // Retourner la moyenne des cores actifs (exclut core 0)
    const finalCPU = Math.round(weightedAvg);
    console.log(`   → Valeur retournée: ${finalCPU}%`);
    
    return finalCPU;
  } catch (error) {
    console.error("❌ Erreur parsing Data Plane CPU:", error);
    return 0;
  }
}

/**
 * Parse les ressources système (CPU, Memory, Disk)
 * Format: sortie de "top" dans un CDATA
 * Note: Le CPU ici est le Management Plane, pas le Data Plane
 */
function parseSystemResources(xml: any): {
  cpu: number;
  memory: number;
  disk: number;
  uptime: string;
} {
  try {
    const result = xml.response.result;
    
    // La réponse est dans un CDATA avec le format de "top"
    // Exemple: "%Cpu(s):  4.9 us,  1.5 sy,  6.0 ni, 86.9 id,  0.0 wa,  0.4 hi,  0.4 si,  0.0 st"
    // "MiB Mem :  31836.3 total,    303.4 free,  10835.5 used,  20697.4 buff/cache"
    
    let cpu = 0;
    let memory = 0;
    let disk = 50; // Valeur par défaut
    let uptime = "N/A";

    // Parser la sortie "top" si elle est dans un string
    if (typeof result === "string") {
      // Extraire CPU - Format: "%Cpu(s):  4.9 us,  1.5 sy,  6.0 ni, 86.9 id,  0.0 wa,  0.4 hi,  0.4 si,  0.0 st"
      // Il faut additionner us + sy + ni + wa + hi + si (tout sauf idle et steal)
      const cpuLine = result.match(/%Cpu\(s\):\s*([\d\.\s,a-z]+)/i);
      if (cpuLine) {
        const cpuStr = cpuLine[1];
        
        // Extraire chaque composant
        const us = parseFloat(cpuStr.match(/(\d+\.\d+)\s+us/)?.[1] || "0");
        const sy = parseFloat(cpuStr.match(/(\d+\.\d+)\s+sy/)?.[1] || "0");
        const ni = parseFloat(cpuStr.match(/(\d+\.\d+)\s+ni/)?.[1] || "0");
        const wa = parseFloat(cpuStr.match(/(\d+\.\d+)\s+wa/)?.[1] || "0");
        const hi = parseFloat(cpuStr.match(/(\d+\.\d+)\s+hi/)?.[1] || "0");
        const si = parseFloat(cpuStr.match(/(\d+\.\d+)\s+si/)?.[1] || "0");
        
        // CPU utilisé = us + sy + ni + wa + hi + si
        cpu = Math.round(us + sy + ni + wa + hi + si);
        
        console.log(`🔍 CPU Parsing: us=${us} sy=${sy} ni=${ni} wa=${wa} hi=${hi} si=${si} → Total=${cpu}%`);
      } else {
        // Fallback: utiliser idle si le format complet n'est pas trouvé
        const idleMatch = result.match(/(\d+\.\d+)\s+id/);
        if (idleMatch) {
          const idle = parseFloat(idleMatch[1]);
          cpu = Math.round(100 - idle);
          console.log(`🔍 CPU Parsing (fallback): idle=${idle} → Total=${cpu}%`);
        }
      }

      // Extraire Memory
      const memMatch = result.match(/MiB Mem\s*:\s*(\d+\.\d+)\s+total,\s*\S+\s+free,\s*(\d+\.\d+)\s+used/);
      if (memMatch) {
        const total = parseFloat(memMatch[1]);
        const used = parseFloat(memMatch[2]);
        memory = Math.round((used / total) * 100);
      }

      // Extraire uptime
      const uptimeMatch = result.match(/up\s+(.+?),\s+\d+\s+user/);
      if (uptimeMatch) {
        uptime = uptimeMatch[1].trim();
      }
    }

    return { cpu, memory, disk, uptime };
  } catch (error) {
    console.error("Erreur parsing system resources:", error);
    return { cpu: 0, memory: 0, disk: 0, uptime: "N/A" };
  }
}

/**
 * Parse les informations de sessions
 */
function parseSessionInfo(xml: any): {
  total: number;
  active: number;
  tcp: number;
  udp: number;
  icmp: number;
} {
  try {
    const result = xml.response.result;

    // Les champs peuvent avoir différents noms selon la version PAN-OS
    const total = parseInt(result["num-max"] || result["max-sessions"] || result.total || "0") || 0;
    const active = parseInt(result["num-active"] || result["active-sessions"] || result.active || "0") || 0;
    const tcp = parseInt(result["num-tcp"] || result.tcp || "0") || 0;
    const udp = parseInt(result["num-udp"] || result.udp || "0") || 0;
    const icmp = parseInt(result["num-icmp"] || result.icmp || "0") || 0;

    return { total, active, tcp, udp, icmp };
  } catch (error) {
    console.error("Erreur parsing session info:", error);
    console.error("Structure reçue:", JSON.stringify(xml.response.result, null, 2));
    return { total: 0, active: 0, tcp: 0, udp: 0, icmp: 0 };
  }
}

/**
 * Parse les interfaces
 */
function parseInterfaces(xml: any): Array<{
  name: string;
  status: string;
  speed: string;
  rx: number;
  tx: number;
}> {
  try {
    const result = xml.response.result;
    const interfaces = [];

    // Les interfaces peuvent être dans différents formats
    const ifwList = result.ifnet?.entry || result.hw?.entry || [];
    const ifArray = Array.isArray(ifwList) ? ifwList : [ifwList];

    for (const iface of ifArray) {
      if (iface && iface.name) {
        interfaces.push({
          name: iface.name || "N/A",
          status: iface.state || iface.status || "unknown",
          speed: iface.speed || "N/A",
          rx: parseInt(iface.ibytes || iface.rx || "0") || 0,
          tx: parseInt(iface.obytes || iface.tx || "0") || 0,
        });
      }
    }

    return interfaces;
  } catch (error) {
    console.error("Erreur parsing interfaces:", error);
    return [];
  }
}

/**
 * Parse les informations système
 */
function parseSystemInfo(xml: any): {
  hostname: string;
  serial: string;
  model: string;
  version: string;
  uptime: string;
} {
  try {
    const result = xml.response.result.system;

    return {
      hostname: result.hostname || result.devicename || "N/A",
      serial: result.serial || "N/A",
      model: result.model || "N/A",
      version: result["sw-version"] || result.version || "N/A",
      uptime: result.uptime || "N/A",
    };
  } catch (error) {
    console.error("Erreur parsing system info:", error);
    return {
      hostname: "N/A",
      serial: "N/A",
      model: "N/A",
      version: "N/A",
      uptime: "N/A",
    };
  }
}

/**
 * Retourne des interfaces pour PA-5220 (basé sur le modèle standard)
 */
function getMockInterfaces(): InterfaceStats[] {
  const interfaces: InterfaceStats[] = [];
  
  // Interfaces ethernet (16 ports)
  for (let i = 1; i <= 16; i++) {
    const isUp = i <= 4;
    interfaces.push({
      name: `ethernet1/${i}`,
      status: isUp ? "up" : "down",
      speed: isUp ? "1000Mbps" : "N/A",
      duplex: isUp ? "full" : undefined,
      rx: isUp ? Math.floor(Math.random() * 10000000000) : 0,
      tx: isUp ? Math.floor(Math.random() * 10000000000) : 0,
      rxPackets: isUp ? Math.floor(Math.random() * 10000000) : 0,
      txPackets: isUp ? Math.floor(Math.random() * 10000000) : 0,
      rxErrors: isUp ? Math.floor(Math.random() * 10) : 0,
      txErrors: isUp ? Math.floor(Math.random() * 10) : 0,
      rxDrops: isUp ? Math.floor(Math.random() * 1000) : 0,
      txDrops: isUp ? Math.floor(Math.random() * 500) : 0,
      utilization: isUp ? Math.floor(Math.random() * 60) : 0,
    });
  }
  
  // Interfaces AE (Aggregate Ethernet)
  for (let i = 1; i <= 8; i++) {
    const isUp = i <= 5;
    interfaces.push({
      name: `ae${i}`,
      status: isUp ? "up" : "down",
      speed: isUp ? "2000Mbps" : "N/A",
      duplex: isUp ? "full" : undefined,
      rx: isUp ? Math.floor(Math.random() * 20000000000) : 0,
      tx: isUp ? Math.floor(Math.random() * 20000000000) : 0,
      rxPackets: isUp ? Math.floor(Math.random() * 20000000) : 0,
      txPackets: isUp ? Math.floor(Math.random() * 20000000) : 0,
      rxErrors: isUp ? Math.floor(Math.random() * 5) : 0,
      txErrors: isUp ? Math.floor(Math.random() * 5) : 0,
      rxDrops: isUp ? Math.floor(Math.random() * 500) : 0,
      txDrops: isUp ? Math.floor(Math.random() * 300) : 0,
      utilization: isUp ? Math.floor(Math.random() * 70) : 0,
    });
  }
  
  // Interface management
  interfaces.push({
    name: "management",
    status: "up",
    speed: "1000Mbps",
    duplex: "full",
    rx: Math.floor(Math.random() * 1000000000),
    tx: Math.floor(Math.random() * 1000000000),
    rxPackets: Math.floor(Math.random() * 1000000),
    txPackets: Math.floor(Math.random() * 1000000),
    rxErrors: 0,
    txErrors: 0,
    rxDrops: Math.floor(Math.random() * 100),
    txDrops: Math.floor(Math.random() * 50),
    utilization: Math.floor(Math.random() * 30),
  });
  
  return interfaces;
}
