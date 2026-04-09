"use client";

import { useState, useEffect } from "react";
import { TSFData, TSFDataComplete, DashboardMetrics, AdvancedMetrics, DiagnosticIssue } from "@/types";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import TSFUpload from "@/components/tsf/TSFUpload";
import TSFDataView from "@/components/tsf/TSFDataView";
import TSFAnalysisView from "@/components/tsf/TSFAnalysisView";
import { DiagnosticCenter } from "@/components/diagnostic/DiagnosticCenter";
import { CPUDiagnostic } from "@/components/diagnostic/CPUDiagnostic";
import { PacketDropsAnalysis } from "@/components/diagnostic/PacketDropsAnalysis";
import { TACDiagnostic } from "@/components/diagnostic/TACDiagnostic";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, AlertCircle, Loader2 } from "lucide-react";

export default function DiagnosticsPage() {
  const [tsfData, setTSFData] = useState<TSFData | null>(null);
  const [tsfDataComplete, setTSFDataComplete] = useState<TSFDataComplete | null>(null);
  const [loading, setLoading] = useState(false);
  const [tsfLoading, setTSFLoading] = useState(false);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState<DashboardMetrics | null>(null);
  const [advancedMetrics, setAdvancedMetrics] = useState<AdvancedMetrics | null>(null);
  const [diagnosticResults, setDiagnosticResults] = useState<{
    issues: DiagnosticIssue[];
    healthScore: number;
    stats?: any;
  } | null>(null);

  const handleUploadSuccess = async (data: TSFData) => {
    setTSFData(data);
    // Lancer automatiquement le diagnostic avec le TSF
    runDiagnostic(data);
  };

  const handleUploadComplete = async (completeData: TSFDataComplete) => {
    setTSFDataComplete(completeData);
  };

  const runDiagnostic = async (tsf?: TSFData) => {
    setDiagnosticLoading(true);
    try {
      // Récupérer les métriques live
      const metricsRes = await fetch("/api/metrics");
      const metrics: DashboardMetrics = await metricsRes.json();
      setLiveMetrics(metrics);

      // Récupérer les métriques avancées
      let advanced: AdvancedMetrics | undefined;
      try {
        const advancedRes = await fetch("/api/metrics-advanced");
        if (advancedRes.ok) {
          advanced = await advancedRes.json();
          setAdvancedMetrics(advanced ?? null);
        }
      } catch (e) {
        console.log("Métriques avancées non disponibles");
      }

      // Lancer le diagnostic
      const diagnosticRes = await fetch("/api/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          liveMetrics: metrics,
          advancedMetrics: advanced,
          tsfData: tsf || tsfData,
        }),
      });

      const result = await diagnosticRes.json();
      setDiagnosticResults({
        issues: result.issues || [],
        healthScore: result.healthScore || 100,
        stats: result.stats,
      });
    } catch (error) {
      console.error("Erreur diagnostic:", error);
    } finally {
      setDiagnosticLoading(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    runDiagnostic().finally(() => setLoading(false));
  };

  const handleExport = () => {
    if (!diagnosticResults) return;

    const report = {
      timestamp: new Date().toISOString(),
      healthScore: diagnosticResults.healthScore,
      stats: diagnosticResults.stats,
      issues: diagnosticResults.issues,
      tsfIncluded: !!tsfData,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diagnostic-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Lancer le diagnostic au chargement
  useEffect(() => {
    runDiagnostic();
  }, []);

  return (
    <DashboardLayout onRefresh={handleRefresh} loading={loading || diagnosticLoading}>
      <Tabs defaultValue="tac" className="space-y-6">
        <TabsList className="bg-white/5 backdrop-blur-sm border border-white/10">
          <TabsTrigger value="tac">Diagnostic TAC Complet</TabsTrigger>
          <TabsTrigger value="diagnostic">Analyse Basique</TabsTrigger>
          <TabsTrigger value="cpu">Analyse CPU</TabsTrigger>
          <TabsTrigger value="drops">Drops Paquets</TabsTrigger>
          <TabsTrigger value="tsf">Tech Support File</TabsTrigger>
        </TabsList>

        <TabsContent value="tac" className="space-y-6">
          <TACDiagnostic onRefresh={handleRefresh} />
        </TabsContent>

        <TabsContent value="diagnostic" className="space-y-6">
          {diagnosticResults ? (
            <DiagnosticCenter
              issues={diagnosticResults.issues}
              healthScore={diagnosticResults.healthScore}
              stats={diagnosticResults.stats}
              onRefresh={handleRefresh}
              onExport={handleExport}
            />
          ) : (
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 p-8 text-center">
              <div className="text-lg font-semibold mb-2">
                Chargement du diagnostic...
              </div>
              <div className="text-gray-400">
                Analyse des métriques en cours
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="cpu" className="space-y-6">
          {liveMetrics && (
            <CPUDiagnostic
              cpuUsage={liveMetrics.system.cpu}
              resourceMonitor={advancedMetrics?.resourceMonitor}
              processes={tsfData?.processes}
            />
          )}
        </TabsContent>

        <TabsContent value="drops" className="space-y-6">
          {advancedMetrics && (
            <PacketDropsAnalysis drops={advancedMetrics.counters.drops} />
          )}
        </TabsContent>

        <TabsContent value="tsf" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Tech Support File Analysis
            </h2>
            <p className="text-muted-foreground">
              Uploadez un Tech Support File pour une analyse TAC-Level complète
            </p>
          </div>

          <TSFUpload 
            onUploadSuccess={handleUploadSuccess} 
            onUploadComplete={handleUploadComplete}
          />

          {tsfLoading && (
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
              <div className="text-lg font-semibold mb-2">
                Analyse du Tech Support File en cours...
              </div>
              <div className="text-gray-400">
                Extraction et parsing de toutes les métriques
              </div>
            </Card>
          )}

          {tsfDataComplete ? (
            <TSFAnalysisView data={tsfDataComplete} />
          ) : tsfData ? (
            <TSFDataView data={tsfData} />
          ) : null}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
