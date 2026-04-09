"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertConfig, AlertRule } from "@/types";
import { Bell, BellOff, Webhook, Save, TestTube, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";

const METRIC_LABELS: Record<AlertRule["metric"], string> = {
  dpCpuAvg:       "DP CPU moyen (%)",
  dpCpuMax:       "DP CPU max (%)",
  mpCpu:          "MP CPU (%)",
  memoryPct:      "Mémoire (%)",
  sessionUtilPct: "Sessions (%)",
  totalDrops:     "Total drops",
  healthScore:    "Health Score",
};

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-10 h-5 rounded-full transition-colors focus:outline-none ${enabled ? "bg-blue-500" : "bg-gray-600"}`}
      aria-label={enabled ? "Désactiver" : "Activer"}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

export default function AlertsPage() {
  const [config, setConfig]         = useState<AlertConfig | null>(null);
  const [saving, setSaving]         = useState(false);
  const [testing, setTesting]       = useState(false);
  const [saved, setSaved]           = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    fetch("/api/alerts/config")
      .then(r => r.json())
      .then(setConfig);
  }, []);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    setSaved(false);
    await fetch("/api/alerts/config", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(config),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const testWebhook = async () => {
    if (!config?.webhookUrl) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res  = await fetch("/api/alerts/test", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ webhookUrl: config.webhookUrl }),
      });
      const data = await res.json();
      setTestResult({ ok: data.ok, msg: data.ok ? "Webhook envoyé avec succès !" : (data.error ?? "Erreur inconnue") });
    } catch {
      setTestResult({ ok: false, msg: "Erreur réseau" });
    } finally {
      setTesting(false);
    }
  };

  const toggleRule = (id: string) => {
    if (!config) return;
    setConfig({ ...config, rules: config.rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r) });
  };

  const updateThreshold = (id: string, threshold: number) => {
    if (!config) return;
    setConfig({ ...config, rules: config.rules.map(r => r.id === id ? { ...r, threshold } : r) });
  };

  if (!config) {
    return (
      <DashboardLayout>
        <div className="flex items-center gap-2 text-gray-400 p-8">
          <RefreshCw className="w-4 h-4 animate-spin" /> Chargement…
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Configuration des alertes</h1>
            <p className="text-gray-400 text-sm mt-1">
              Notifications automatiques déclenchées à chaque diagnostic TAC
            </p>
          </div>
          <Button onClick={save} disabled={saving} className={saved ? "bg-green-600 hover:bg-green-700" : ""}>
            {saved
              ? <><CheckCircle className="w-4 h-4 mr-2" />Sauvegardé</>
              : <><Save className="w-4 h-4 mr-2" />{saving ? "Sauvegarde…" : "Sauvegarder"}</>
            }
          </Button>
        </div>

        {/* Webhook */}
        <Card className="bg-white/5 border-white/10 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Webhook className="w-5 h-5 text-blue-400" />
              Webhook (Slack / Teams / custom)
            </h2>
            <button
              onClick={() => setConfig({ ...config, webhookEnabled: !config.webhookEnabled })}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                config.webhookEnabled
                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                  : "bg-white/5 text-gray-400 border-white/10"
              }`}
            >
              {config.webhookEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              {config.webhookEnabled ? "Activé" : "Désactivé"}
            </button>
          </div>

          <div className="flex gap-3">
            <input
              type="url"
              placeholder="https://hooks.slack.com/services/..."
              value={config.webhookUrl ?? ""}
              onChange={e => setConfig({ ...config, webhookUrl: e.target.value })}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-600"
            />
            <Button
              variant="outline"
              onClick={testWebhook}
              disabled={testing || !config.webhookUrl}
            >
              <TestTube className="w-4 h-4 mr-2" />
              {testing ? "Envoi…" : "Tester"}
            </Button>
          </div>

          {testResult && (
            <div className={`mt-3 flex items-center gap-2 text-sm ${testResult.ok ? "text-green-400" : "text-red-400"}`}>
              {testResult.ok
                ? <CheckCircle className="w-4 h-4" />
                : <AlertTriangle className="w-4 h-4" />
              }
              {testResult.msg}
            </div>
          )}

          <p className="mt-4 text-xs text-gray-500">
            Le payload envoyé est compatible avec les webhooks entrants Slack et Microsoft Teams.
            Pour un endpoint custom, attendez un POST JSON avec le champ <code className="bg-white/10 px-1 rounded">text</code>.
          </p>
        </Card>

        {/* Règles */}
        <Card className="bg-white/5 border-white/10 p-6">
          <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
            <Bell className="w-5 h-5 text-yellow-400" />
            Règles d&apos;alerte
          </h2>

          <div className="space-y-3">
            {config.rules.map(rule => (
              <div
                key={rule.id}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  rule.enabled
                    ? "bg-white/5 border-white/10"
                    : "bg-white/[0.02] border-white/5 opacity-50"
                }`}
              >
                <Toggle enabled={rule.enabled} onToggle={() => toggleRule(rule.id)} />

                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{rule.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {METRIC_LABELS[rule.metric]}{" "}
                    {rule.condition === "gt" ? ">" : rule.condition === "lt" ? "<" : "="}{" "}
                    <strong>{rule.threshold}</strong>
                    {" · "}cooldown {rule.cooldownMinutes}min
                    {rule.lastFiredAt && (
                      <span className="ml-2 text-gray-600">
                        · dernier déclenchement : {new Date(rule.lastFiredAt).toLocaleString("fr-FR")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                    rule.severity === "critical" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                    rule.severity === "major"    ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                    "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                  }`}>
                    {rule.severity}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">Seuil :</span>
                    <input
                      type="number"
                      value={rule.threshold}
                      onChange={e => updateThreshold(rule.id, Number(e.target.value))}
                      className="w-20 bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Info */}
        <Card className="bg-blue-500/5 border-blue-500/20 p-4">
          <p className="text-sm text-blue-300 flex items-start gap-2">
            <Bell className="w-4 h-4 mt-0.5 shrink-0" />
            Les alertes sont évaluées automatiquement à chaque diagnostic TAC lancé depuis l&apos;onglet Diagnostics.
            Le cooldown évite les notifications répétées pour le même problème.
          </p>
        </Card>
      </div>
    </DashboardLayout>
  );
}
