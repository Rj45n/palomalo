import { parseStringPromise } from "xml2js";
import { PanOSKeygenResponse } from "@/types";
import https from "https";

/**
 * Effectue une requête HTTPS avec support des certificats auto-signés
 */
function httpsRequest(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const options = {
      rejectUnauthorized: false, // Accepter les certificats auto-signés
    };

    https
      .get(url, options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`Erreur HTTP: ${res.statusCode}`));
          }
        });
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

/**
 * Génère une clé API PAN-OS via l'endpoint keygen
 * @param url - URL ou IP du firewall (sans protocole)
 * @param username - Nom d'utilisateur
 * @param password - Mot de passe
 * @returns La clé API générée
 */
export async function generateApiKey(
  url: string,
  username: string,
  password: string
): Promise<string> {
  // Nettoyer l'URL (enlever http/https si présent)
  const cleanUrl = url.replace(/^https?:\/\//, "");

  // Construire l'URL de keygen
  const keygenUrl = `https://${cleanUrl}/api/?type=keygen&user=${encodeURIComponent(
    username
  )}&password=${encodeURIComponent(password)}`;

  try {
    // Appel à l'API PAN-OS avec support des certificats auto-signés
    const xmlData = await httpsRequest(keygenUrl);

    // Parser le XML avec options plus permissives
    const parsed = await parseStringPromise(xmlData, {
      explicitArray: false,
      mergeAttrs: true,
      trim: true,
      normalize: true,
    });

    // Vérifier le statut de la réponse
    if (!parsed.response || parsed.response.status !== "success") {
      const errorMsg = parsed.response?.msg || "Erreur inconnue";
      throw new Error(`Erreur PAN-OS: ${errorMsg}`);
    }

    // Extraire la clé - plusieurs formats possibles
    let key = parsed.response.result?.key;
    
    // Si key est un tableau, prendre le premier élément
    if (Array.isArray(key)) {
      key = key[0];
    }

    // Si key est un objet avec une propriété texte
    if (typeof key === "object" && key !== null) {
      key = key._ || key.value || Object.values(key)[0];
    }

    if (!key || typeof key !== "string") {
      throw new Error("Clé API non trouvée dans la réponse");
    }

    return key.trim();
  } catch (error) {
    if (error instanceof Error) {
      // Erreurs réseau courantes
      if (error.message.includes("ENOTFOUND")) {
        throw new Error("Firewall introuvable. Vérifiez l'URL/IP.");
      }
      if (error.message.includes("ECONNREFUSED")) {
        throw new Error("Connexion refusée. Le firewall est-il accessible ?");
      }
      if (error.message.includes("ETIMEDOUT")) {
        throw new Error("Délai d'attente dépassé. Vérifiez la connectivité.");
      }
      if (error.message.includes("certificate")) {
        throw new Error(
          "Erreur de certificat SSL. Vérifiez la configuration HTTPS."
        );
      }
      throw error;
    }
    throw new Error("Erreur inconnue lors de la génération de la clé API");
  }
}

/**
 * Effectue un appel API PAN-OS avec une clé existante
 * @param url - URL ou IP du firewall
 * @param apiKey - Clé API
 * @param command - Commande à exécuter (ex: "show system resources")
 * @returns La réponse XML parsée
 */
export async function executeCommand(
  url: string,
  apiKey: string,
  command: string
): Promise<any> {
  const cleanUrl = url.replace(/^https?:\/\//, "");

  // Construire la commande XML correctement pour PAN-OS
  // "show system resources" devient "<show><system><resources></resources></system></show>"
  const parts = command.split(" ");
  let xmlCommand = "";
  
  // Ouvrir les tags
  for (const part of parts) {
    xmlCommand += `<${part}>`;
  }
  // Fermer les tags dans l'ordre inverse
  for (let i = parts.length - 1; i >= 0; i--) {
    xmlCommand += `</${parts[i]}>`;
  }

  const apiUrl = `https://${cleanUrl}/api/?type=op&cmd=${encodeURIComponent(
    xmlCommand
  )}&key=${apiKey}`;

  try {
    const xmlData = await httpsRequest(apiUrl);
    
    const parsed = await parseStringPromise(xmlData, {
      explicitArray: false,
      mergeAttrs: true,
      trim: true,
      normalize: true,
    });

    if (parsed.response.status !== "success") {
      throw new Error(
        `Erreur PAN-OS: ${parsed.response.msg || "Erreur inconnue"}`
      );
    }

    return parsed;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Erreur lors de l'exécution de la commande");
  }
}

/**
 * Récupère la configuration des interfaces via l'API config
 * @param url - URL ou IP du firewall
 * @param apiKey - Clé API
 * @param type - Type d'interface ("ethernet" ou "aggregate-ethernet")
 * @returns La réponse XML parsée
 */
export async function getInterfaceConfig(
  url: string,
  apiKey: string,
  type: "ethernet" | "aggregate-ethernet"
): Promise<any> {
  const cleanUrl = url.replace(/^https?:\/\//, "");
  
  const xpath = `/config/devices/entry[@name='localhost.localdomain']/network/interface/${type}`;
  const apiUrl = `https://${cleanUrl}/api/?type=config&action=show&xpath=${encodeURIComponent(
    xpath
  )}&key=${apiKey}`;

  try {
    const xmlData = await httpsRequest(apiUrl);
    
    const parsed = await parseStringPromise(xmlData, {
      explicitArray: false,
      mergeAttrs: true,
      trim: true,
      normalize: true,
    });

    if (parsed.response.status !== "success") {
      throw new Error(
        `Erreur PAN-OS: ${parsed.response.msg || "Erreur inconnue"}`
      );
    }

    return parsed;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Erreur lors de la récupération de la configuration");
  }
}

/**
 * Récupère les statistiques opérationnelles d'une interface spécifique
 * @param url - URL ou IP du firewall
 * @param apiKey - Clé API
 * @param interfaceName - Nom de l'interface (ex: "ethernet1/1", "ae1")
 * @returns Les statistiques de l'interface
 */
export async function getInterfaceStats(
  url: string,
  apiKey: string,
  interfaceName: string
): Promise<any> {
  const cleanUrl = url.replace(/^https?:\/\//, "");

  // Construire la commande XML pour "show counter interface <name>"
  const xmlCommand = `<show><counter><interface>${interfaceName}</interface></counter></show>`;
  const apiUrl = `https://${cleanUrl}/api/?type=op&cmd=${encodeURIComponent(
    xmlCommand
  )}&key=${apiKey}`;

  try {
    const xmlData = await httpsRequest(apiUrl);
    const parsed = await parseStringPromise(xmlData, {
      explicitArray: false,
      mergeAttrs: true,
      trim: true,
      normalize: true,
    });

    if (parsed.response.status !== "success") {
      throw new Error(
        `Erreur PAN-OS: ${parsed.response.msg || "Erreur inconnue"}`
      );
    }

    return parsed;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Erreur lors de la récupération des stats pour ${interfaceName}`);
  }
}

/**
 * Valide le format d'une URL/IP
 * @param url - URL ou IP à valider
 * @returns true si valide
 */
export function validateFirewallUrl(url: string): boolean {
  // Regex pour IP ou hostname
  const ipRegex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const hostnameRegex =
    /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

  const cleanUrl = url.replace(/^https?:\/\//, "");
  return ipRegex.test(cleanUrl) || hostnameRegex.test(cleanUrl);
}

/**
 * Récupère les métriques du resource monitor (dataplane)
 * @param url - URL ou IP du firewall
 * @param apiKey - Clé API
 * @returns Les métriques du resource monitor
 */
export async function getResourceMonitor(
  url: string,
  apiKey: string
): Promise<any> {
  // Utiliser une commande CLI directe car "resource-monitor" contient un tiret
  // qui peut poser problème avec le format XML standard
  const cleanUrl = url.replace(/^https?:\/\//, "");
  
  // Format CLI pour les commandes avec tirets
  const xmlCommand = `<show><running><resource-monitor><minute></minute></resource-monitor></running></show>`;
  
  const apiUrl = `https://${cleanUrl}/api/?type=op&cmd=${encodeURIComponent(
    xmlCommand
  )}&key=${apiKey}`;

  try {
    const xmlData = await httpsRequest(apiUrl);
    
    const parsed = await parseStringPromise(xmlData, {
      explicitArray: false,
      mergeAttrs: true,
      trim: true,
      normalize: true,
    });

    console.log("📊 Resource Monitor - Status:", parsed.response?.status);
    console.log("📊 Resource Monitor - Keys:", Object.keys(parsed.response?.result || {}).slice(0, 10));

    if (parsed.response.status !== "success") {
      console.error("❌ Resource Monitor Error:", parsed.response.msg);
      return null;
    }

    return parsed;
  } catch (error) {
    console.error("❌ Erreur getResourceMonitor:", error);
    return null;
  }
}

/**
 * Récupère les counters globaux avec filtres
 * @param url - URL ou IP du firewall
 * @param apiKey - Clé API
 * @param severity - Filtre de sévérité (drop, warn, etc.)
 * @returns Les counters globaux
 */
export async function getGlobalCounters(
  url: string,
  apiKey: string,
  severity?: string
): Promise<any> {
  let command = "show counter global filter delta yes";
  if (severity) {
    command += ` severity ${severity}`;
  }
  return executeCommand(url, apiKey, command);
}

/**
 * Récupère le statut HA complet
 * @param url - URL ou IP du firewall
 * @param apiKey - Clé API
 * @returns Le statut HA
 */
export async function getHAStatus(
  url: string,
  apiKey: string
): Promise<any> {
  return executeCommand(url, apiKey, "show high-availability all");
}

/**
 * Récupère le résumé du routing
 * @param url - URL ou IP du firewall
 * @param apiKey - Clé API
 * @returns Le résumé du routing
 */
export async function getRoutingSummary(
  url: string,
  apiKey: string
): Promise<any> {
  return executeCommand(url, apiKey, "show routing summary");
}

/**
 * Récupère le statut BGP
 * @param url - URL ou IP du firewall
 * @param apiKey - Clé API
 * @returns Le statut BGP
 */
export async function getBGPSummary(
  url: string,
  apiKey: string
): Promise<any> {
  return executeCommand(url, apiKey, "show routing protocol bgp summary");
}

/**
 * Récupère les tunnels VPN IKE
 * @param url - URL ou IP du firewall
 * @param apiKey - Clé API
 * @returns Les tunnels IKE
 */
export async function getVPNIKE(
  url: string,
  apiKey: string
): Promise<any> {
  return executeCommand(url, apiKey, "show vpn ike-sa");
}

/**
 * Récupère les tunnels VPN IPSec
 * @param url - URL ou IP du firewall
 * @param apiKey - Clé API
 * @returns Les tunnels IPSec
 */
export async function getVPNIPSec(
  url: string,
  apiKey: string
): Promise<any> {
  return executeCommand(url, apiKey, "show vpn ipsec-sa");
}

/**
 * Récupère les utilisateurs GlobalProtect connectés
 * @param url - URL ou IP du firewall
 * @param apiKey - Clé API
 * @returns Les utilisateurs GP
 */
export async function getGlobalProtectUsers(
  url: string,
  apiKey: string
): Promise<any> {
  return executeCommand(url, apiKey, "show global-protect-gateway current-user");
}

/**
 * Récupère l'historique CPU sur 1 heure (Data Plane)
 * Donne 60 points de mesure = tendance longue pour détecter un CPU chroniquement élevé
 */
export async function getResourceMonitorHour(
  url: string,
  apiKey: string
): Promise<any> {
  const cleanUrl = url.replace(/^https?:\/\//, "");
  const xmlCommand = `<show><running><resource-monitor><hour></hour></resource-monitor></running></show>`;
  const apiUrl = `https://${cleanUrl}/api/?type=op&cmd=${encodeURIComponent(xmlCommand)}&key=${apiKey}`;

  try {
    const xmlData = await httpsRequest(apiUrl);
    const parsed = await parseStringPromise(xmlData, {
      explicitArray: false, mergeAttrs: true, trim: true, normalize: true,
    });
    if (parsed.response.status !== "success") return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Récupère les backlogs d'ingress sur les cores Data Plane
 * Un backlog > 0 indique un core saturé qui ne peut plus traiter les paquets entrants
 */
export async function getResourceMonitorIngress(
  url: string,
  apiKey: string
): Promise<any> {
  const cleanUrl = url.replace(/^https?:\/\//, "");
  const xmlCommand = `<show><running><resource-monitor><ingress-backlogs></ingress-backlogs></resource-monitor></running></show>`;
  const apiUrl = `https://${cleanUrl}/api/?type=op&cmd=${encodeURIComponent(xmlCommand)}&key=${apiKey}`;

  try {
    const xmlData = await httpsRequest(apiUrl);
    const parsed = await parseStringPromise(xmlData, {
      explicitArray: false, mergeAttrs: true, trim: true, normalize: true,
    });
    if (parsed.response.status !== "success") return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Récupère les compteurs globaux sans filtre (tous les compteurs non-zéro)
 * Permet d'identifier les compteurs liés au CPU : flow_lookup, flow_fastpath, etc.
 */
export async function getGlobalCountersAll(
  url: string,
  apiKey: string
): Promise<any> {
  const cleanUrl = url.replace(/^https?:\/\//, "");
  const xmlCommand = `<show><counter><global><filter><delta>yes</delta></filter></global></counter></show>`;
  const apiUrl = `https://${cleanUrl}/api/?type=op&cmd=${encodeURIComponent(xmlCommand)}&key=${apiKey}`;

  try {
    const xmlData = await httpsRequest(apiUrl);
    const parsed = await parseStringPromise(xmlData, {
      explicitArray: false, mergeAttrs: true, trim: true, normalize: true,
    });
    if (parsed.response.status !== "success") return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Récupère les statistiques de session étendues
 * Inclut offloaded, predicted, discard, etc.
 */
export async function getSessionStats(
  url: string,
  apiKey: string
): Promise<any> {
  const cleanUrl = url.replace(/^https?:\/\//, "");
  const xmlCommand = `<show><session><statistics></statistics></session></show>`;
  const apiUrl = `https://${cleanUrl}/api/?type=op&cmd=${encodeURIComponent(xmlCommand)}&key=${apiKey}`;

  try {
    const xmlData = await httpsRequest(apiUrl);
    const parsed = await parseStringPromise(xmlData, {
      explicitArray: false, mergeAttrs: true, trim: true, normalize: true,
    });
    if (parsed.response.status !== "success") return null;
    return parsed;
  } catch {
    return null;
  }
}
