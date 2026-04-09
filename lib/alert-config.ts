import { promises as fs } from "fs";
import path from "path";
import { AlertConfig, AlertRule } from "@/types";

const CONFIG_FILE = path.join(process.cwd(), "data", "alert-config.json");

const DEFAULT_CONFIG: AlertConfig = {
  webhookEnabled: false,
  emailEnabled:   false,
  rules: [
    { id: "r1", name: "DP CPU critique",   enabled: true, condition: "gt", metric: "dpCpuAvg",       threshold: 85,    severity: "critical", cooldownMinutes: 15 },
    { id: "r2", name: "DP CPU élevé",      enabled: true, condition: "gt", metric: "dpCpuAvg",       threshold: 70,    severity: "major",    cooldownMinutes: 30 },
    { id: "r3", name: "Mémoire critique",  enabled: true, condition: "gt", metric: "memoryPct",      threshold: 90,    severity: "critical", cooldownMinutes: 15 },
    { id: "r4", name: "Sessions saturées", enabled: true, condition: "gt", metric: "sessionUtilPct", threshold: 80,    severity: "major",    cooldownMinutes: 30 },
    { id: "r5", name: "Health Score bas",  enabled: true, condition: "lt", metric: "healthScore",    threshold: 50,    severity: "critical", cooldownMinutes: 10 },
    { id: "r6", name: "Drops élevés",      enabled: true, condition: "gt", metric: "totalDrops",     threshold: 10000, severity: "warning",  cooldownMinutes: 60 },
  ],
};

async function ensureFile(): Promise<void> {
  try { await fs.access(CONFIG_FILE); }
  catch {
    await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true });
    await fs.writeFile(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf-8");
  }
}

export async function getAlertConfig(): Promise<AlertConfig> {
  await ensureFile();
  const raw = await fs.readFile(CONFIG_FILE, "utf-8");
  const stored = JSON.parse(raw) as Partial<AlertConfig>;
  // Fusionner avec les defaults pour garantir les champs obligatoires
  return { ...DEFAULT_CONFIG, ...stored };
}

export async function saveAlertConfig(config: AlertConfig): Promise<void> {
  await ensureFile();
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

export async function updateRuleLastFired(ruleId: string): Promise<void> {
  const config = await getAlertConfig();
  const rule = config.rules.find((r: AlertRule) => r.id === ruleId);
  if (rule) {
    rule.lastFiredAt = new Date().toISOString();
    await saveAlertConfig(config);
  }
}
