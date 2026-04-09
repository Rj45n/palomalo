"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardMetrics, DiagnosticIssue } from "@/types";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import MetricCard from "@/components/dashboard/MetricCard";
import CPUMemoryChart from "@/components/dashboard/CPUMemoryChart";
import SessionsChart from "@/components/dashboard/SessionsChart";
import InterfacesTableEnhanced from "@/components/dashboard/InterfacesTableEnhanced";
import InterfaceIssuesPanel from "@/components/dashboard/InterfaceIssuesPanel";
import DiagnosticPanel from "@/components/diagnostic/DiagnosticPanel";
import MetricsSkeleton from "@/components/dashboard/MetricsSkeleton";
import { Activity, Cpu, HardDrive, Network } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<Array<{ time: string; cpu: number; memory: number }>>([]);
  const [diagnosticIssues, setDiagnosticIssues] = useState<DiagnosticIssue[]>([]);
  const [healthScore, setHealthScore] = useState<number>(100);

  // Vérifier la session et charger les métriques
  useEffect(() => {
    checkSession();
    loadMetrics();
    
    // Refresh automatique toutes les 30s
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkSession = async () => {
    try {
      const response = await fetch("/api/connect");
      if (!response.ok) {
        router.push("/");
      }
    } catch (err) {
      router.push("/");
    }
  };

  const loadMetrics = async () => {
    try {
      // Utiliser l'API réelle pour afficher les vraies données du firewall
      const response = await fetch("/api/metrics");
      if (!response.ok) {
        throw new Error("Erreur lors du chargement des métriques");
      }
      const data = await response.json();
      setMetrics(data);
      
      // Ajouter à l'historique pour les graphiques
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
      setHistory((prev) => {
        const newHistory = [
          ...prev,
          {
            time: timeStr,
            cpu: data.system.cpu,
            memory: data.system.memory,
          },
        ];
        // Garder seulement les 20 dernières entrées
        return newHistory.slice(-20);
      });
      
      // Lancer le diagnostic automatique
      runDiagnostic(data);
      
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const runDiagnostic = async (liveMetrics: DashboardMetrics) => {
    try {
      const response = await fetch("/api/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liveMetrics }),
      });

      if (response.ok) {
        const result = await response.json();
        setDiagnosticIssues(result.issues || []);
        setHealthScore(result.healthScore || 100);
      }
    } catch (err) {
      console.error("Erreur diagnostic:", err);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    loadMetrics();
  };

  if (loading && !metrics) {
    return (
      <DashboardLayout onRefresh={handleRefresh}>
        <MetricsSkeleton />
      </DashboardLayout>
    );
  }

  if (error && !metrics) {
    return (
      <DashboardLayout onRefresh={handleRefresh}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-destructive mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-paloalto-blue text-white rounded-md hover:bg-paloalto-blue/90"
            >
              Réessayer
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout onRefresh={handleRefresh} loading={loading}>
      <div className="space-y-6">
        {/* Cartes métriques principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Data Plane CPU"
            value={metrics?.system.cpu || 0}
            unit="%"
            icon={Cpu}
            color="blue"
          />
          <MetricCard
            title="Memory"
            value={metrics?.system.memory || 0}
            unit="%"
            icon={HardDrive}
            color="orange"
          />
          <MetricCard
            title="Sessions"
            value={metrics?.sessions.total || 0}
            unit=""
            icon={Activity}
            color="green"
          />
          <MetricCard
            title="Interfaces"
            value={metrics?.interfaces.length || 0}
            unit=""
            icon={Network}
            color="purple"
          />
        </div>

        {/* Graphiques */}
        {history.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CPUMemoryChart data={history} />
            {metrics?.sessions && <SessionsChart data={metrics.sessions} />}
          </div>
        )}

        {/* Informations système */}
        {metrics?.info && (
          <div className="glass rounded-lg p-6 border border-white/10">
            <h2 className="text-xl font-semibold mb-4">Informations Système</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Hostname</p>
                <p className="font-medium">{metrics.info.hostname}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Modèle</p>
                <p className="font-medium">{metrics.info.model}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Version</p>
                <p className="font-medium">{metrics.info.version}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Uptime</p>
                <p className="font-medium">{metrics.info.uptime}</p>
              </div>
            </div>
          </div>
        )}

        {/* Diagnostic Global */}
        {diagnosticIssues.length > 0 && (
          <DiagnosticPanel issues={diagnosticIssues} healthScore={healthScore} />
        )}

        {/* Diagnostic Interfaces */}
        {metrics?.interfaceIssues && metrics.interfaceIssues.length > 0 && (
          <InterfaceIssuesPanel issues={metrics.interfaceIssues} />
        )}

        {/* Table des interfaces améliorée */}
        {metrics?.interfaces && metrics.interfaces.length > 0 && (
          <InterfacesTableEnhanced interfaces={metrics.interfaces} />
        )}
      </div>
    </DashboardLayout>
  );
}
