"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Cpu, Activity, AlertTriangle, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface CPUDiagnosticProps {
  cpuUsage: number;
  resourceMonitor?: {
    dataplane: { core: number; usage: number }[];
    packetDescriptor: number;
    sessionUtilization: number;
    bufferUtilization: number;
  };
  processes?: Array<{
    pid: string;
    name: string;
    cpu: number;
    memory: number;
  }>;
}

export function CPUDiagnostic({ cpuUsage, resourceMonitor, processes }: CPUDiagnosticProps) {
  const getCPUColor = (usage: number) => {
    if (usage >= 90) return "text-red-500";
    if (usage >= 75) return "text-orange-500";
    if (usage >= 60) return "text-yellow-500";
    return "text-green-500";
  };

  const getCPUStatus = (usage: number) => {
    if (usage >= 90) return "CRITIQUE";
    if (usage >= 75) return "ÉLEVÉ";
    if (usage >= 60) return "MODÉRÉ";
    return "NORMAL";
  };

  const getRecommendations = (usage: number) => {
    if (usage >= 90) {
      return [
        "⚠️ ACTION IMMÉDIATE REQUISE",
        "1. Identifier les processus consommateurs (voir ci-dessous)",
        "2. Vérifier les règles de sécurité complexes",
        "3. Vérifier s'il y a une attaque DDoS en cours",
        "4. Considérer l'activation du hardware offload",
        "5. Planifier un upgrade hardware si récurrent",
      ];
    } else if (usage >= 75) {
      return [
        "⚠️ SURVEILLANCE REQUISE",
        "1. Identifier les processus consommateurs",
        "2. Optimiser les règles de sécurité",
        "3. Surveiller l'évolution",
      ];
    } else if (usage >= 60) {
      return [
        "ℹ️ SURVEILLANCE RECOMMANDÉE",
        "1. Surveiller l'évolution",
        "2. Planifier une optimisation si augmentation",
      ];
    }
    return ["✅ CPU dans les limites normales"];
  };

  const cliCommands = [
    "show system resources",
    "show running resource-monitor minute",
    "show running resource-monitor second",
    "show counter global filter delta yes",
    "debug dataplane pow performance",
    "show session info",
  ];

  // Préparer les données pour le graphique des cores
  const coreData = resourceMonitor?.dataplane.map((core) => ({
    name: `Core ${core.core}`,
    usage: core.usage,
  })) || [];

  // Top 10 processus CPU
  const topProcesses = processes
    ?.sort((a, b) => b.cpu - a.cpu)
    .slice(0, 10) || [];

  return (
    <Card className="bg-white/5 backdrop-blur-sm border-white/10 p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Cpu className="w-8 h-8 text-blue-500" />
            <div>
              <h2 className="text-2xl font-bold">Diagnostic CPU</h2>
              <p className="text-sm text-gray-400">Analyse approfondie de l'utilisation CPU</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-bold ${getCPUColor(cpuUsage)}`}>
              {cpuUsage}%
            </div>
            <div className={`text-sm font-semibold ${getCPUColor(cpuUsage)}`}>
              {getCPUStatus(cpuUsage)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Data Plane CPU (moyenne)
            </div>
          </div>
        </div>

        {/* Alerte si CPU élevé */}
        {cpuUsage >= 75 && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold text-orange-500 mb-2">
                  CPU {cpuUsage >= 90 ? "CRITIQUE" : "ÉLEVÉ"} - Action requise
                </div>
                <div className="space-y-1 text-sm">
                  {getRecommendations(cpuUsage).map((rec, i) => (
                    <div key={i} className="text-gray-300">{rec}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CPU par core (Dataplane) */}
        {coreData.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              CPU Dataplane par Core
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={coreData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" stroke="#888" />
                  <YAxis stroke="#888" domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(0,0,0,0.8)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="usage" fill="#0072B8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {coreData.some((c) => c.usage > 90) && (
              <div className="mt-3 text-sm text-orange-500">
                ⚠️ Un ou plusieurs cores sont saturés (&gt; 90%)
              </div>
            )}
          </div>
        )}

        {/* Top processus */}
        {topProcesses.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Top 10 Processus Consommateurs
            </h3>
            <div className="space-y-2">
              {topProcesses.map((proc, i) => (
                <div
                  key={proc.pid}
                  className="flex items-center justify-between bg-white/5 rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-gray-400 text-sm w-6">#{i + 1}</div>
                    <div>
                      <div className="font-mono text-sm">{proc.name}</div>
                      <div className="text-xs text-gray-500">PID: {proc.pid}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${getCPUColor(proc.cpu)}`}>
                      {proc.cpu.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">
                      {proc.memory.toFixed(1)}% RAM
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Métriques additionnelles */}
        {resourceMonitor && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Packet Descriptors</div>
              <div className={`text-2xl font-bold ${getCPUColor(resourceMonitor.packetDescriptor)}`}>
                {resourceMonitor.packetDescriptor.toFixed(1)}%
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Session Utilization</div>
              <div className={`text-2xl font-bold ${getCPUColor(resourceMonitor.sessionUtilization)}`}>
                {resourceMonitor.sessionUtilization.toFixed(1)}%
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Buffer Utilization</div>
              <div className={`text-2xl font-bold ${getCPUColor(resourceMonitor.bufferUtilization)}`}>
                {resourceMonitor.bufferUtilization.toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        {/* Commandes CLI */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Commandes de Diagnostic</h3>
          <div className="space-y-2">
            {cliCommands.map((cmd, i) => (
              <div
                key={i}
                className="bg-black/30 rounded-lg p-3 font-mono text-sm flex items-center justify-between group"
              >
                <code className="text-gray-300">{cmd}</code>
                <Button
                  size="sm"
                  variant="ghost"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => {
                    navigator.clipboard.writeText(cmd);
                  }}
                >
                  Copier
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Explications */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="font-semibold text-blue-400 mb-2">
            💡 Comment diagnostiquer un CPU élevé
          </div>
          <div className="text-sm text-gray-300 space-y-2">
            <div>
              <strong>1. Identifier les processus :</strong> Utilisez "show system resources" pour voir les processus consommateurs
            </div>
            <div>
              <strong>2. Analyser le dataplane :</strong> Utilisez "show running resource-monitor" pour voir la charge par core
            </div>
            <div>
              <strong>3. Vérifier le trafic :</strong> Utilisez "show counter global" pour voir les paquets traités
            </div>
            <div>
              <strong>4. Causes courantes :</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Attaque DDoS (vérifier les counters)</li>
                <li>Règles de sécurité complexes (App-ID, SSL decrypt)</li>
                <li>Trafic légitime excessif (upgrade hardware)</li>
                <li>Bug logiciel (vérifier les hotfixes disponibles)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
