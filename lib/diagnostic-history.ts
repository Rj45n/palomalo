/**
 * Persistance de l'historique des diagnostics sur disque (JSON)
 * Fichier : data/diagnostic-history.json — max 100 entrées FIFO
 */
import { promises as fs } from "fs";
import path from "path";
import { DiagnosticRecord } from "@/types";

const DATA_FILE = path.join(process.cwd(), "data", "diagnostic-history.json");
const MAX_RECORDS = 100;

async function ensureFile(): Promise<void> {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, "[]", "utf-8");
  }
}

export async function getAllRecords(): Promise<DiagnosticRecord[]> {
  await ensureFile();
  const raw = await fs.readFile(DATA_FILE, "utf-8");
  return JSON.parse(raw) as DiagnosticRecord[];
}

export async function getRecord(id: string): Promise<DiagnosticRecord | null> {
  const all = await getAllRecords();
  return all.find(r => r.id === id) ?? null;
}

export async function saveRecord(record: DiagnosticRecord): Promise<void> {
  await ensureFile();
  const all = await getAllRecords();
  all.unshift(record);
  await fs.writeFile(DATA_FILE, JSON.stringify(all.slice(0, MAX_RECORDS), null, 2), "utf-8");
}

export async function deleteRecord(id: string): Promise<boolean> {
  const all = await getAllRecords();
  const filtered = all.filter(r => r.id !== id);
  if (filtered.length === all.length) return false;
  await fs.writeFile(DATA_FILE, JSON.stringify(filtered, null, 2), "utf-8");
  return true;
}

export function buildRecord(diagnostic: any, durationMs: number): DiagnosticRecord {
  const issues = diagnostic.issues ?? [];
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    hostname: diagnostic.system?.hostname ?? "unknown",
    model:    diagnostic.system?.model    ?? "unknown",
    version:  diagnostic.system?.version  ?? "unknown",
    healthScore: diagnostic.healthScore ?? 100,
    issueCount: {
      critical: issues.filter((i: any) => i.severity === "critical").length,
      major:    issues.filter((i: any) => i.severity === "major").length,
      warning:  issues.filter((i: any) => i.severity === "warning").length,
      info:     issues.filter((i: any) => i.severity === "info").length,
    },
    issues: issues.map((i: any) => ({
      id:             i.id ?? "",
      severity:       i.severity,
      category:       i.category,
      title:          i.title,
      description:    i.description,
      recommendation: i.recommendation,
    })),
    metrics: {
      dpCpuAvg:       diagnostic.dataPlane?.averageCPU      ?? 0,
      dpCpuMax:       diagnostic.dataPlane?.maxCPU          ?? 0,
      mpCpu:          diagnostic.managementPlane?.cpu?.total ?? 0,
      memoryPct:      diagnostic.managementPlane?.memory?.percentUsed ?? 0,
      sessionUtilPct: diagnostic.sessions?.utilization      ?? 0,
      packetRate:     diagnostic.sessions?.packetRate        ?? 0,
      totalDrops:     diagnostic.counters?.total             ?? 0,
    },
    durationMs,
  };
}
