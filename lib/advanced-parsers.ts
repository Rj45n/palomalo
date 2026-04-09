/**
 * Parsers pour les métriques avancées PAN-OS
 * Extraction et normalisation des données TAC-level
 */

import { AdvancedMetrics } from "@/types";

/**
 * Parse la sortie de "show running resource-monitor minute"
 */
export function parseResourceMonitor(xmlData: any): AdvancedMetrics["resourceMonitor"] {
  const result: AdvancedMetrics["resourceMonitor"] = {
    dataplane: [],
    packetDescriptor: 0,
    sessionUtilization: 0,
    bufferUtilization: 0,
  };

  try {
    const data = xmlData?.response?.result;
    if (!data) return result;

    // Parser les cores dataplane
    const dpCores = data["dp-core"];
    if (dpCores) {
      const coresArray = Array.isArray(dpCores) ? dpCores : [dpCores];
      coresArray.forEach((core: any, index: number) => {
        const cpuLoad = core["cpu-load-minute"];
        if (cpuLoad) {
          // Prendre la première valeur (la plus récente)
          const values = cpuLoad.split(/\s+/).filter((v: string) => v);
          const usage = parseFloat(values[0]) || 0;
          result.dataplane.push({ core: index, usage });
        }
      });
    }

    // Parser packet descriptor utilization
    const pktDesc = data["packet-descriptor"];
    if (pktDesc) {
      const values = pktDesc.split(/\s+/).filter((v: string) => v);
      result.packetDescriptor = parseFloat(values[0]) || 0;
    }

    // Parser session utilization
    const sessUtil = data["session-utilization"];
    if (sessUtil) {
      const values = sessUtil.split(/\s+/).filter((v: string) => v);
      result.sessionUtilization = parseFloat(values[0]) || 0;
    }

    // Parser buffer utilization
    const bufUtil = data["buffer-utilization"];
    if (bufUtil) {
      const values = bufUtil.split(/\s+/).filter((v: string) => v);
      result.bufferUtilization = parseFloat(values[0]) || 0;
    }
  } catch (error) {
    console.error("Erreur parsing resource monitor:", error);
  }

  return result;
}

/**
 * Parse la sortie de "show counter global filter delta yes severity drop"
 */
export function parseGlobalCounters(xmlData: any): AdvancedMetrics["counters"] {
  const result: AdvancedMetrics["counters"] = {
    drops: [],
    warnings: [],
  };

  try {
    const counters = xmlData?.response?.result?.global?.counters?.entry;
    if (!counters) return result;

    const counterArray = Array.isArray(counters) ? counters : [counters];
    
    counterArray.forEach((counter: any) => {
      const name = counter.name || counter.category || "unknown";
      const value = parseInt(counter.value || "0", 10);
      const severity = counter.severity || "info";
      const desc = counter.desc || counter.description || "";

      if (value > 0) {
        if (severity === "drop") {
          result.drops.push({
            name,
            count: value,
            severity,
            reason: desc,
          });
        } else if (severity === "warn") {
          result.warnings.push({
            name,
            count: value,
          });
        }
      }
    });

    // Trier par count décroissant
    result.drops.sort((a, b) => b.count - a.count);
    result.warnings.sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error("Erreur parsing global counters:", error);
  }

  return result;
}

/**
 * Parse la sortie de "show high-availability all"
 */
export function parseHAStatus(xmlData: any): AdvancedMetrics["ha"] {
  const result: AdvancedMetrics["ha"] = {
    enabled: false,
    localState: "disabled",
    peerState: "unknown",
    syncStatus: "unknown",
  };

  try {
    const ha = xmlData?.response?.result;
    if (!ha) {
      console.log("⚠️ HA: Pas de données dans response.result");
      return result;
    }

    result.enabled = ha.enabled === "yes" || ha.enabled === true;
    console.log(`📊 HA enabled: ${result.enabled}`);
    
    if (result.enabled) {
      const localInfo = ha["local-info"] || ha.group?.["local-info"];
      const peerInfo = ha["peer-info"] || ha.group?.["peer-info"];

      if (localInfo) {
        result.localState = localInfo.state || "unknown";
        console.log(`   Local state: ${result.localState}`);
      }

      if (peerInfo) {
        // Parser l'état du peer correctement
        // États possibles: active, passive, active-primary, active-secondary, 
        // initial, suspended, non-functional, tentative
        const peerState = peerInfo.state || peerInfo["ha-state"] || peerInfo.status;
        
        if (peerState) {
          result.peerState = peerState.toLowerCase();
        } else {
          // Si pas d'état mais peerInfo existe, considérer comme connecté
          result.peerState = "connected";
        }
        
        // Vérifier aussi la connectivité
        const conn = peerInfo.conn || peerInfo["conn-status"] || peerInfo["conn-ha1"];
        if (conn) {
          const connStatus = typeof conn === "string" ? conn : conn.status || conn.state;
          console.log(`   Peer conn-status: ${connStatus}`);
          if (connStatus && connStatus.toLowerCase().includes("down")) {
            result.peerState = "disconnected";
          }
        }
        
        console.log(`   Peer state: ${result.peerState}`);
      } else {
        console.log("⚠️ HA: Pas de peer-info trouvé");
      }

      // Parser le sync status
      const sync = ha["running-sync"] || ha["running-sync-enabled"] || ha["sync-status"] || ha.group?.["running-sync"];
      if (sync) {
        result.syncStatus = sync.toLowerCase();
        console.log(`   Sync status: ${result.syncStatus}`);
      }
      
      // Extraire le dernier failover si disponible
      if (ha["last-failover"]) {
        result.lastFailover = ha["last-failover"];
        console.log(`   Last failover: ${result.lastFailover}`);
      }
    }
  } catch (error) {
    console.error("❌ Erreur parsing HA status:", error);
  }

  return result;
}

/**
 * Parse la sortie de "show routing summary"
 */
export function parseRoutingSummary(xmlData: any): AdvancedMetrics["routing"] {
  const result: AdvancedMetrics["routing"] = {
    totalRoutes: 0,
    bgpPeers: [],
    ospfNeighbors: [],
  };

  try {
    const routing = xmlData?.response?.result;
    if (!routing) return result;

    // Compter les routes totales
    if (routing["total-routes"]) {
      result.totalRoutes = parseInt(routing["total-routes"], 10) || 0;
    } else if (routing.entry) {
      const entries = Array.isArray(routing.entry) ? routing.entry : [routing.entry];
      result.totalRoutes = entries.length;
    }
  } catch (error) {
    console.error("Erreur parsing routing summary:", error);
  }

  return result;
}

/**
 * Parse la sortie de "show routing protocol bgp summary"
 */
export function parseBGPSummary(xmlData: any): AdvancedMetrics["routing"]["bgpPeers"] {
  const peers: AdvancedMetrics["routing"]["bgpPeers"] = [];

  try {
    const bgp = xmlData?.response?.result?.entry;
    if (!bgp) return peers;

    const peerArray = Array.isArray(bgp) ? bgp : [bgp];
    
    peerArray.forEach((peer: any) => {
      peers.push({
        peer: peer["peer-address"] || peer.peer || "unknown",
        state: peer.state || peer.status || "unknown",
        prefixes: parseInt(peer["prefix-counter"] || peer.prefixes || "0", 10),
      });
    });
  } catch (error) {
    console.error("Erreur parsing BGP summary:", error);
  }

  return peers;
}

/**
 * Parse la sortie de "show vpn ike-sa"
 */
export function parseVPNIKE(xmlData: any): AdvancedMetrics["vpn"]["ikeSa"] {
  const tunnels: AdvancedMetrics["vpn"]["ikeSa"] = [];

  try {
    const ike = xmlData?.response?.result?.entry;
    if (!ike) return tunnels;

    const ikeArray = Array.isArray(ike) ? ike : [ike];
    
    ikeArray.forEach((tunnel: any) => {
      tunnels.push({
        name: tunnel.name || tunnel.gateway || "unknown",
        peer: tunnel["peer-address"] || tunnel.peer || "unknown",
        state: tunnel.state || tunnel.status || "unknown",
      });
    });
  } catch (error) {
    console.error("Erreur parsing VPN IKE:", error);
  }

  return tunnels;
}

/**
 * Parse la sortie de "show vpn ipsec-sa"
 */
export function parseVPNIPSec(xmlData: any): AdvancedMetrics["vpn"]["ipsecSa"] {
  const tunnels: AdvancedMetrics["vpn"]["ipsecSa"] = [];

  try {
    const ipsec = xmlData?.response?.result?.entry;
    if (!ipsec) return tunnels;

    const ipsecArray = Array.isArray(ipsec) ? ipsec : [ipsec];
    
    ipsecArray.forEach((tunnel: any) => {
      tunnels.push({
        name: tunnel.name || tunnel.tunnel || "unknown",
        spi: tunnel.spi || "unknown",
        encapPackets: parseInt(tunnel["encap-packets"] || tunnel.packets || "0", 10),
      });
    });
  } catch (error) {
    console.error("Erreur parsing VPN IPSec:", error);
  }

  return tunnels;
}

/**
 * Parse la sortie de "show global-protect-gateway current-user"
 */
export function parseGlobalProtect(xmlData: any): AdvancedMetrics["globalProtect"] {
  const result: AdvancedMetrics["globalProtect"] = {
    connectedUsers: 0,
    users: [],
  };

  try {
    const gp = xmlData?.response?.result?.entry;
    if (!gp) return result;

    const userArray = Array.isArray(gp) ? gp : [gp];
    result.connectedUsers = userArray.length;
    
    userArray.forEach((user: any) => {
      result.users.push({
        username: user.username || user.user || "unknown",
        ip: user["virtual-ip"] || user.ip || "unknown",
        loginTime: user["login-time"] || user.connected || "unknown",
      });
    });
  } catch (error) {
    console.error("Erreur parsing GlobalProtect:", error);
  }

  return result;
}
