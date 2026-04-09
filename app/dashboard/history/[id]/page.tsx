"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DiagnosticRecord } from "@/types";
import { ChevronLeft, Download, Clock, Cpu, HardDrive, Network, AlertCircle, CheckCircle } from "lucide-react";

function severityColor(s: string) {
  return s === "critical" ? "bg-red-500/20 text-red-400 border-red-500/30" :
         s === "major"    ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
         s === "warning"  ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
         "bg-blue-500/20 text-blue-400 border-blue-500/30";
}

export default function HistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }  = use(params);
  const [record, setRecord]   = useState<DiagnosticRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/diagnostic/history?id=${id}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then(data => { if (data) setRecord(data); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)  return <DashboardLayout><div className="text-gray-400 p-8 animate-pulse">Chargement…</div></DashboardLayout>;
  if (notFound) return <DashboardLayout><div className="text-red-400 p-8">Diagnostic introuvable.</div></DashboardLayout>;
  if (!record)  return null;

  const scoreColor = record.healthScore >= 80 ? "text-green-400" : record.healthScore >= 50 ? "text-yellow-400" : "text-red-400";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Breadcrumb + actions */}
        <div className="flex items-center justify-between">
          <Link href="/dashboard/history" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" /> Historique
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/api/diagnostic/export-pdf?id=${id}`, "_blank")}
          >
            <Download className="w-4 h-4 mr-2" /> Exporter PDF
          </Button>
        </div>

        {/* Header */}
        <Card className="bg-white/5 border-white/10 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold font-mono">{record.hostname}</h1>
              <p className="text-gray-400 text-sm">{record.model} · PAN-OS {record.version}</p>
              <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(record.timestamp).toLocaleString("fr-FR")}
                <span className="ml-2 text-gray-600">({record.durationMs}ms)</span>
              </p>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-bold ${scoreColor}`}>{record.healthScore}%</div>
              <div className="text-xs text-gray-400">Health Score</div>
            </div>
          </div>
        </Card>

        {/* Métriques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "DP CPU moy", value: `${record.metrics.dpCpuAvg}%`, icon: Cpu,       warn: record.metrics.dpCpuAvg > 80 },
            { label: "DP CPU max", value: `${record.metrics.dpCpuMax}%`, icon: Cpu,       warn: record.metrics.dpCpuMax > 80 },
            { label: "Mémoire",    value: `${record.metrics.memoryPct}%`, icon: HardDrive, warn: record.metrics.memoryPct > 80 },
            { label: "Sessions",   value: `${record.metrics.sessionUtilPct}%`, icon: Network, warn: record.metrics.sessionUtilPct > 70 },
          ].map(m => (
            <Card key={m.label} className="bg-white/5 border-white/10 p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">{m.label}</span>
                <m.icon className={`w-4 h-4 ${m.warn ? "text-red-400" : "text-gray-500"}`} />
              </div>
              <div className={`text-2xl font-bold ${m.warn ? "text-red-400" : "text-white"}`}>{m.value}</div>
            </Card>
          ))}
        </div>

        {/* Issues */}
        <Card className="bg-white/5 border-white/10 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            {record.issues.length > 0
              ? <><AlertCircle className="w-5 h-5 text-red-400" />{record.issues.length} problème(s) détecté(s)</>
              : <><CheckCircle className="w-5 h-5 text-green-400" />Aucun problème détecté</>
            }
          </h2>
          {record.issues.length > 0 ? (
            <div className="space-y-3">
              {record.issues.map((issue, i) => (
                <div key={i} className={`p-4 rounded-lg border ${severityColor(issue.severity)}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm">{issue.title}</div>
                      <div className="text-xs text-gray-300 mt-1">{issue.description}</div>
                      <div className="text-xs text-gray-400 mt-2">→ {issue.recommendation}</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded font-bold uppercase shrink-0 border ${severityColor(issue.severity)}`}>
                      {issue.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-green-400 text-sm">Tous les systèmes fonctionnent normalement.</p>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
