/**
 * Évalue les règles d'alerte sur un DiagnosticRecord
 * et envoie les notifications (webhook HTTP compatible Slack/Teams/custom)
 */
import { DiagnosticRecord, AlertConfig, AlertRule } from "@/types";
import { getAlertConfig, updateRuleLastFired } from "./alert-config";

interface FiredAlert {
  rule: AlertRule;
  actualValue: number;
  record: DiagnosticRecord;
}

function getMetricValue(record: DiagnosticRecord, metric: AlertRule["metric"]): number {
  switch (metric) {
    case "dpCpuAvg":       return record.metrics.dpCpuAvg;
    case "dpCpuMax":       return record.metrics.dpCpuMax;
    case "mpCpu":          return record.metrics.mpCpu;
    case "memoryPct":      return record.metrics.memoryPct;
    case "sessionUtilPct": return record.metrics.sessionUtilPct;
    case "totalDrops":     return record.metrics.totalDrops;
    case "healthScore":    return record.healthScore;
  }
}

function evaluateCondition(value: number, condition: AlertRule["condition"], threshold: number): boolean {
  if (condition === "gt") return value > threshold;
  if (condition === "lt") return value < threshold;
  return value === threshold;
}

function isInCooldown(rule: AlertRule): boolean {
  if (!rule.lastFiredAt) return false;
  const elapsedMinutes = (Date.now() - new Date(rule.lastFiredAt).getTime()) / 60000;
  return elapsedMinutes < rule.cooldownMinutes;
}

function severityEmoji(severity: string): string {
  return severity === "critical" ? "🔴" : severity === "major" ? "🟠" : "🟡";
}

async function sendWebhook(config: AlertConfig, alert: FiredAlert): Promise<void> {
  if (!config.webhookEnabled || !config.webhookUrl) return;

  const { rule, actualValue, record } = alert;
  const condLabel = rule.condition === "gt" ? ">" : rule.condition === "lt" ? "<" : "=";

  // Format compatible Slack / Teams (incoming webhook)
  const payload = {
    text: [
      `${severityEmoji(rule.severity)} *PaloMalo Alert* — ${rule.severity.toUpperCase()}`,
      `*Firewall :* ${record.hostname} (${record.model} · PAN-OS ${record.version})`,
      `*Règle :* ${rule.name}`,
      `*Valeur :* ${actualValue} ${condLabel} ${rule.threshold}`,
      `*Health Score :* ${record.healthScore}%`,
      `*Timestamp :* ${new Date(record.timestamp).toLocaleString("fr-FR")}`,
    ].join("\n"),
    username:   "PaloMalo",
    icon_emoji: ":fire:",
  };

  try {
    const res = await fetch(config.webhookUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });
    if (!res.ok) console.warn(`Webhook réponse non-OK: ${res.status}`);
  } catch (e) {
    console.error("Erreur envoi webhook:", e);
  }
}

export async function evaluateAndFireAlerts(record: DiagnosticRecord): Promise<FiredAlert[]> {
  const config = await getAlertConfig();
  const fired: FiredAlert[] = [];

  for (const rule of config.rules) {
    if (!rule.enabled)       continue;
    if (isInCooldown(rule))  continue;

    const value = getMetricValue(record, rule.metric);
    if (evaluateCondition(value, rule.condition, rule.threshold)) {
      const alert: FiredAlert = { rule, actualValue: value, record };
      fired.push(alert);
      // Mettre à jour lastFiredAt avant l'envoi pour éviter les doublons en cas d'erreur
      await updateRuleLastFired(rule.id);
      await sendWebhook(config, alert);
    }
  }

  return fired;
}

export async function testWebhook(webhookUrl: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(webhookUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        text: "✅ *PaloMalo* — Test de webhook réussi ! Les alertes sont correctement configurées.",
        username:   "PaloMalo",
        icon_emoji: ":white_check_mark:",
      }),
    });
    return { ok: res.ok };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}
