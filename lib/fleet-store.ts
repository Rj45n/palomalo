/**
 * Stockage persistant de la flotte de firewalls (data/fleet.json)
 * Les mots de passe sont stockés en clair côté serveur uniquement.
 * Jamais exposés via les API publiques (FirewallEntrySafe).
 */
import { promises as fs } from "fs";
import path from "path";
import { FirewallEntry, FirewallEntrySafe, FirewallSnapshot, FirewallStatus } from "@/types";

const FLEET_FILE    = path.join(process.cwd(), "data", "fleet.json");
const SNAPSHOT_FILE = path.join(process.cwd(), "data", "fleet-snapshots.json");

async function ensureFile(file: string, defaultValue: string): Promise<void> {
  try { await fs.access(file); }
  catch {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, defaultValue, "utf-8");
  }
}

// ── Firewalls ────────────────────────────────────────────────────────────────

export async function getAllFirewalls(): Promise<FirewallEntry[]> {
  await ensureFile(FLEET_FILE, "[]");
  return JSON.parse(await fs.readFile(FLEET_FILE, "utf-8")) as FirewallEntry[];
}

export async function getFirewall(id: string): Promise<FirewallEntry | null> {
  const all = await getAllFirewalls();
  return all.find(f => f.id === id) ?? null;
}

export async function addFirewall(entry: Omit<FirewallEntry, "id" | "addedAt" | "status">): Promise<FirewallEntry> {
  const all = await getAllFirewalls();
  const fw: FirewallEntry = {
    ...entry,
    id:      `fw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    addedAt: new Date().toISOString(),
    status:  "unknown",
  };
  all.push(fw);
  await fs.writeFile(FLEET_FILE, JSON.stringify(all, null, 2), "utf-8");
  return fw;
}

export async function updateFirewall(id: string, patch: Partial<Omit<FirewallEntry, "id" | "addedAt">>): Promise<FirewallEntry | null> {
  const all = await getAllFirewalls();
  const idx = all.findIndex(f => f.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...patch };
  await fs.writeFile(FLEET_FILE, JSON.stringify(all, null, 2), "utf-8");
  return all[idx];
}

export async function deleteFirewall(id: string): Promise<boolean> {
  const all = await getAllFirewalls();
  const filtered = all.filter(f => f.id !== id);
  if (filtered.length === all.length) return false;
  await fs.writeFile(FLEET_FILE, JSON.stringify(filtered, null, 2), "utf-8");
  return true;
}

/** Retourne les firewalls sans les mots de passe */
export function sanitize(fw: FirewallEntry): FirewallEntrySafe {
  const { password: _pw, ...safe } = fw;
  return safe;
}

// ── Snapshots ────────────────────────────────────────────────────────────────

export async function getAllSnapshots(): Promise<Record<string, FirewallSnapshot>> {
  await ensureFile(SNAPSHOT_FILE, "{}");
  return JSON.parse(await fs.readFile(SNAPSHOT_FILE, "utf-8")) as Record<string, FirewallSnapshot>;
}

export async function saveSnapshot(snapshot: FirewallSnapshot): Promise<void> {
  await ensureFile(SNAPSHOT_FILE, "{}");
  const all = await getAllSnapshots();
  all[snapshot.firewallId] = snapshot;
  await fs.writeFile(SNAPSHOT_FILE, JSON.stringify(all, null, 2), "utf-8");
  // Mettre à jour le statut dans fleet.json
  await updateFirewall(snapshot.firewallId, {
    status:      snapshot.status,
    lastSeenAt:  snapshot.status !== "offline" ? snapshot.collectedAt : undefined,
  });
}

// ── Collecte des métriques d'un firewall ─────────────────────────────────────

export async function collectSnapshot(fw: FirewallEntry): Promise<FirewallSnapshot> {
  const base: FirewallSnapshot = {
    firewallId:     fw.id,
    collectedAt:    new Date().toISOString(),
    status:         "offline",
    hostname:       fw.label,
    model:          "unknown",
    version:        "unknown",
    uptime:         "unknown",
    healthScore:    0,
    dpCpuAvg:       0,
    mpCpu:          0,
    memoryPct:      0,
    sessionUtilPct: 0,
    sessionCount:   0,
    interfacesDown: 0,
    criticalIssues: 0,
    majorIssues:    0,
  };

  try {
    // Obtenir la clé API
    const keygenUrl = `${fw.url}/api/?type=keygen&user=${encodeURIComponent(fw.username)}&password=${encodeURIComponent(fw.password)}`;
    const keyRes = await fetch(keygenUrl, {
      signal: AbortSignal.timeout(10000),
      // @ts-expect-error — option Node.js pour ignorer les certs auto-signés
      rejectUnauthorized: false,
    });
    const keyXml = await keyRes.text();
    const keyMatch = keyXml.match(/<key>([^<]+)<\/key>/);
    if (!keyMatch) {
      return { ...base, error: "Authentification échouée" };
    }
    const apiKey = keyMatch[1];

    // Récupérer les métriques système
    const sysRes = await fetch(
      `${fw.url}/api/?type=op&cmd=<show><system><info></info></system></show>&key=${apiKey}`,
      { signal: AbortSignal.timeout(10000) }
    );
    const sysXml = await sysRes.text();

    const hostname = sysXml.match(/<hostname>([^<]+)<\/hostname>/)?.[1] ?? fw.label;
    const model    = sysXml.match(/<model>([^<]+)<\/model>/)?.[1]    ?? "unknown";
    const version  = sysXml.match(/<sw-version>([^<]+)<\/sw-version>/)?.[1] ?? "unknown";
    const uptime   = sysXml.match(/<uptime>([^<]+)<\/uptime>/)?.[1]  ?? "unknown";

    // Ressources système
    const resRes = await fetch(
      `${fw.url}/api/?type=op&cmd=<show><system><resources></resources></system></show>&key=${apiKey}`,
      { signal: AbortSignal.timeout(10000) }
    );
    const resXml = await resRes.text();
    const cpuMatch  = resXml.match(/(\d+\.\d+)\s+\d+\.\d+\s+\d+\.\d+\s+\d+\s+\d+\s+\d+\s+us/);
    const memMatch  = resXml.match(/Mem:\s+\d+\s+(\d+)\s+(\d+)/);
    const mpCpu     = cpuMatch ? Math.round(parseFloat(cpuMatch[1])) : 0;
    const memUsed   = memMatch ? parseInt(memMatch[1]) : 0;
    const memFree   = memMatch ? parseInt(memMatch[2]) : 1;
    const memoryPct = memUsed + memFree > 0 ? Math.round((memUsed / (memUsed + memFree)) * 100) : 0;

    // Sessions
    const sessRes = await fetch(
      `${fw.url}/api/?type=op&cmd=<show><session><info></info></session></show>&key=${apiKey}`,
      { signal: AbortSignal.timeout(10000) }
    );
    const sessXml = await sessRes.text();
    const sessCount = parseInt(sessXml.match(/<num-active>(\d+)<\/num-active>/)?.[1] ?? "0");
    const sessMax   = parseInt(sessXml.match(/<num-max>(\d+)<\/num-max>/)?.[1] ?? "1");
    const sessUtil  = sessMax > 0 ? Math.round((sessCount / sessMax) * 100) : 0;

    // DP CPU via resource-monitor
    const dpRes = await fetch(
      `${fw.url}/api/?type=op&cmd=<show><running><resource-monitor><minute><last>1</last></minute></resource-monitor></running></show>&key=${apiKey}`,
      { signal: AbortSignal.timeout(10000) }
    );
    const dpXml = await dpRes.text();
    const dpCpuValues = [...dpXml.matchAll(/<cpu-load-average>(\d+)<\/cpu-load-average>/g)].map(m => parseInt(m[1]));
    const dpCpuAvg = dpCpuValues.length > 0 ? Math.round(dpCpuValues.reduce((a, b) => a + b, 0) / dpCpuValues.length) : 0;

    // Score de santé simplifié
    let healthScore = 100;
    if (dpCpuAvg > 90)    healthScore -= 30;
    else if (dpCpuAvg > 70) healthScore -= 15;
    if (mpCpu > 80)       healthScore -= 20;
    if (memoryPct > 90)   healthScore -= 20;
    if (sessUtil > 80)    healthScore -= 15;
    healthScore = Math.max(0, healthScore);

    const status: FirewallStatus = healthScore >= 70 ? "online" : healthScore >= 40 ? "degraded" : "degraded";

    const snapshot: FirewallSnapshot = {
      firewallId:     fw.id,
      collectedAt:    new Date().toISOString(),
      status,
      hostname,
      model,
      version,
      uptime,
      healthScore,
      dpCpuAvg,
      mpCpu,
      memoryPct,
      sessionUtilPct: sessUtil,
      sessionCount:   sessCount,
      interfacesDown: 0,
      criticalIssues: healthScore < 40 ? 1 : 0,
      majorIssues:    healthScore < 70 ? 1 : 0,
    };

    await saveSnapshot(snapshot);
    return snapshot;

  } catch (err) {
    const error = err instanceof Error ? err.message : "Erreur inconnue";
    const snapshot = { ...base, error };
    await saveSnapshot(snapshot);
    return snapshot;
  }
}
