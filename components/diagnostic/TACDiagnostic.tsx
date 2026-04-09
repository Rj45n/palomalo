"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Cpu, HardDrive, Network, AlertTriangle, 
  CheckCircle, RefreshCw, Server, Shield, Globe,
  TrendingUp, Users, Zap, AlertCircle, Flame, Activity,
  BarChart2, Clock
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine, Legend,
} from "recharts";

interface TACDiagnosticProps {
  onRefresh?: () => void;
}

export function TACDiagnostic({ onRefresh }: TACDiagnosticProps) {
  const [loading, setLoading] = useState(true);
  const [diagnostic, setDiagnostic] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDiagnostic = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/diagnostic-live");
      if (!response.ok) throw new Error("Erreur lors du diagnostic");
      
      const data = await response.json();
      setDiagnostic(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDiagnostic();
  }, []);

  if (loading) {
    return (
      <Card className="bg-white/5 backdrop-blur-sm border-white/10 p-8">
        <div className="flex items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
          <span>Exécution du diagnostic TAC-level...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-500/10 border-red-500/30 p-8">
        <div className="text-center text-red-500">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
          <p>{error}</p>
          <Button onClick={loadDiagnostic} className="mt-4">Réessayer</Button>
        </div>
      </Card>
    );
  }

  if (!diagnostic) return null;

  const healthColor = diagnostic.healthScore >= 80 ? "text-green-500" : 
                      diagnostic.healthScore >= 50 ? "text-yellow-500" : "text-red-500";

  const cpuCoreData = diagnostic.dataPlane?.cores?.slice(0, 20).map((c: any) => ({
    name: `Core ${c.core}`,
    cpu: c.current,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header avec Health Score */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Diagnostic TAC-Level</h2>
          <p className="text-gray-400 text-sm">
            Analyse complète en temps réel • {new Date(diagnostic.timestamp).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className={`text-4xl font-bold ${healthColor}`}>
              {diagnostic.healthScore}%
            </div>
            <div className="text-sm text-gray-400">Health Score</div>
          </div>
          <Button onClick={loadDiagnostic} variant="outline" size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Problèmes détectés */}
      {diagnostic.issues?.length > 0 && (
        <Card className="bg-red-500/10 border-red-500/30 p-6">
          <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {diagnostic.issues.length} Problème(s) détecté(s)
          </h3>
          <div className="space-y-3">
            {diagnostic.issues.map((issue: any, idx: number) => (
              <div 
                key={idx}
                className={`p-4 rounded-lg border ${
                  issue.severity === "critical" ? "bg-red-500/20 border-red-500/50" :
                  issue.severity === "major" ? "bg-orange-500/20 border-orange-500/50" :
                  issue.severity === "warning" ? "bg-yellow-500/20 border-yellow-500/50" :
                  "bg-blue-500/20 border-blue-500/50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{issue.title}</div>
                    <div className="text-sm text-gray-300 mt-1">{issue.description}</div>
                    <div className="text-xs text-gray-400 mt-2">{issue.recommendation}</div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    issue.severity === "critical" ? "bg-red-500 text-white" :
                    issue.severity === "major" ? "bg-orange-500 text-white" :
                    issue.severity === "warning" ? "bg-yellow-500 text-black" :
                    "bg-blue-500 text-white"
                  }`}>
                    {issue.severity.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Data Plane CPU */}
        <MetricCard
          title="Data Plane CPU"
          value={diagnostic.dataPlane?.averageCPU || 0}
          unit="%"
          icon={Cpu}
          color={diagnostic.dataPlane?.averageCPU > 80 ? "red" : diagnostic.dataPlane?.averageCPU > 60 ? "yellow" : "green"}
          subtitle={`Max: ${diagnostic.dataPlane?.maxCPU || 0}% • ${diagnostic.dataPlane?.activeCores || 0} cores`}
        />
        
        {/* Management CPU */}
        <MetricCard
          title="Management CPU"
          value={Math.round(diagnostic.managementPlane?.cpu?.total || 0)}
          unit="%"
          icon={Server}
          color={diagnostic.managementPlane?.cpu?.total > 70 ? "yellow" : "green"}
          subtitle={`Load: ${diagnostic.managementPlane?.loadAverage?.["1min"]?.toFixed(1) || "N/A"}`}
        />
        
        {/* Memory */}
        <MetricCard
          title="Mémoire"
          value={diagnostic.managementPlane?.memory?.percentUsed || 0}
          unit="%"
          icon={HardDrive}
          color={diagnostic.managementPlane?.memory?.percentUsed > 80 ? "red" : "green"}
          subtitle={`${Math.round((diagnostic.managementPlane?.memory?.usedMB || 0) / 1024)} / ${Math.round((diagnostic.managementPlane?.memory?.totalMB || 0) / 1024)} GB`}
        />
        
        {/* Sessions */}
        <MetricCard
          title="Sessions"
          value={diagnostic.sessions?.utilization || 0}
          unit="%"
          icon={Network}
          color={diagnostic.sessions?.utilization > 70 ? "yellow" : "green"}
          subtitle={`${(diagnostic.sessions?.allocated || 0).toLocaleString()} actives`}
        />
      </div>

      {/* Deuxième ligne de métriques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Packet Rate */}
        <MetricCard
          title="Packet Rate"
          value={Math.round((diagnostic.sessions?.packetRate || 0) / 1000)}
          unit="K pps"
          icon={Zap}
          color="blue"
          subtitle={`${((diagnostic.sessions?.throughputKbps || 0) / 1000).toFixed(1)} Mbps`}
        />
        
        {/* New Connections */}
        <MetricCard
          title="Nouvelles Connexions"
          value={diagnostic.sessions?.newConnectionRate || 0}
          unit="cps"
          icon={TrendingUp}
          color="blue"
          subtitle="Connexions par seconde"
        />
        
        {/* Drops */}
        <MetricCard
          title="Packet Drops"
          value={diagnostic.counters?.total || 0}
          unit=""
          icon={AlertTriangle}
          color={(diagnostic.counters?.total || 0) > 1000 ? "red" : "green"}
          subtitle={`${diagnostic.counters?.drops?.length || 0} raisons`}
        />
        
        {/* HA Status */}
        <MetricCard
          title="HA Status"
          value={diagnostic.ha?.enabled ? diagnostic.ha.localState : "Standalone"}
          unit=""
          icon={Shield}
          color={diagnostic.ha?.enabled && diagnostic.ha.peerState !== "active" && diagnostic.ha.peerState !== "passive" ? "yellow" : "green"}
          subtitle={diagnostic.ha?.enabled ? `Peer: ${diagnostic.ha.peerState}` : "HA non activé"}
        />
      </div>

      {/* Section CPU avancée */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU par Core (actuel) */}
        {cpuCoreData.length > 0 && (
          <Card className="bg-white/5 backdrop-blur-sm border-white/10 p-6">
            <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-blue-400" />
              CPU Data Plane — Cores actuels
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Moy: <span className={diagnostic.dataPlane?.averageCPU > 80 ? "text-red-400 font-bold" : "text-green-400"}>{diagnostic.dataPlane?.averageCPU}%</span>
              {" "}• Max: <span className={diagnostic.dataPlane?.maxCPU > 80 ? "text-red-400 font-bold" : "text-yellow-400"}>{diagnostic.dataPlane?.maxCPU}%</span>
              {diagnostic.dataPlane?.hotCores > 0 && <span className="text-red-400 ml-2">⚠ {diagnostic.dataPlane.hotCores} core(s) &gt; 80%</span>}
            </p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cpuCoreData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                  <XAxis dataKey="name" stroke="#666" fontSize={9} />
                  <YAxis stroke="#666" domain={[0, 100]} fontSize={10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                    formatter={(v: number) => [`${v}%`, "CPU"]}
                  />
                  <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="4 2" label={{ value: "80%", fill: "#ef4444", fontSize: 10 }} />
                  <Bar dataKey="cpu" fill="#0072B8" radius={[2, 2, 0, 0]}
                    label={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Backlogs */}
            {diagnostic.ingressBacklogs?.hasSaturation && (
              <div className="mt-3 p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-sm">
                <span className="text-red-400 font-semibold flex items-center gap-1">
                  <Flame className="w-4 h-4" />
                  {diagnostic.ingressBacklogs.saturatedCores} core(s) avec backlog ingress — saturation détectée
                </span>
              </div>
            )}
          </Card>
        )}

        {/* Tendance CPU 1 heure */}
        {diagnostic.cpuHistory?.points?.length > 0 ? (
          <Card className="bg-white/5 backdrop-blur-sm border-white/10 p-6">
            <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-400" />
              Tendance CPU — 1 heure
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Moy 1h: <span className={diagnostic.cpuHistory.overallAvg > 80 ? "text-red-400 font-bold" : "text-green-400"}>{diagnostic.cpuHistory.overallAvg}%</span>
              {" "}• Max 1h: <span className={diagnostic.cpuHistory.overallMax > 80 ? "text-red-400 font-bold" : "text-yellow-400"}>{diagnostic.cpuHistory.overallMax}%</span>
              {diagnostic.cpuHistory.isChronic && <span className="text-red-400 ml-2 font-bold">⚠ CPU chroniquement élevé</span>}
            </p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={diagnostic.cpuHistory.points} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                  <XAxis dataKey="label" stroke="#666" fontSize={9} interval="preserveStartEnd" />
                  <YAxis stroke="#666" domain={[0, 100]} fontSize={10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                    formatter={(v: number, name: string) => [`${v}%`, name === "avgCPU" ? "Moy" : "Max"]}
                  />
                  <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="4 2" label={{ value: "Seuil 80%", fill: "#ef4444", fontSize: 10 }} />
                  <Legend formatter={(v) => v === "avgCPU" ? "CPU moyen" : "CPU max"} />
                  <Line type="monotone" dataKey="avgCPU" stroke="#0072B8" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="maxCPU" stroke="#f97316" dot={false} strokeWidth={1.5} strokeDasharray="3 2" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        ) : (
          <Card className="bg-white/5 backdrop-blur-sm border-white/10 p-6 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Tendance 1h non disponible</p>
            </div>
          </Card>
        )}
      </div>

      {/* CPU par groupe fonctionnel + Top processus MP */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU par groupe fonctionnel DP */}
        {diagnostic.dataPlane?.groups?.length > 0 && (
          <Card className="bg-white/5 backdrop-blur-sm border-white/10 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-cyan-400" />
              CPU par groupe fonctionnel (DP)
            </h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={diagnostic.dataPlane.groups.slice(0, 12).map((g: any) => ({ name: g.name, cpu: g.current, avg: g.avg }))}
                  margin={{ top: 0, right: 10, bottom: 0, left: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                  <XAxis type="number" domain={[0, 100]} stroke="#666" fontSize={10} />
                  <YAxis type="category" dataKey="name" stroke="#666" fontSize={10} width={90} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                    formatter={(v: number) => [`${v}%`, "CPU"]}
                  />
                  <Bar dataKey="cpu" fill="#06b6d4" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Top processus Management Plane */}
        {diagnostic.managementPlane?.topProcesses?.length > 0 && (
          <Card className="bg-white/5 backdrop-blur-sm border-white/10 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-400" />
              Top processus Management Plane
            </h3>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {diagnostic.managementPlane.topProcesses.map((proc: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-white/5 rounded text-sm">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-gray-500 text-xs w-4">{idx + 1}</span>
                    <span className="font-mono truncate text-xs">{proc.name}</span>
                    <span className="text-gray-500 text-xs">PID:{proc.pid}</span>
                  </div>
                  <div className="flex items-center gap-3 ml-2 shrink-0">
                    <span className={`font-semibold text-xs ${proc.cpu > 20 ? "text-red-400" : proc.cpu > 10 ? "text-yellow-400" : "text-green-400"}`}>
                      CPU {proc.cpu}%
                    </span>
                    <span className="text-gray-400 text-xs">MEM {proc.mem}%</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Processus Data Plane */}
      {(diagnostic.dataPlane?.processes?.length > 0 || diagnostic.dataPlane?.groups?.length > 0) && (
        <Card className="bg-white/5 backdrop-blur-sm border-white/10 p-6">
          <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-orange-400" />
            Processus Data Plane
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            Tasks actives sur le(s) Data Processor(s) — pan_task, pan_comm, pan_hdl…
          </p>

          {diagnostic.dataPlane?.processes?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {diagnostic.dataPlane.processes.map((proc: any, idx: number) => {
                const pct = Math.min(proc.cpu, 100);
                const color = proc.cpu > 50 ? "bg-red-500" : proc.cpu > 20 ? "bg-orange-500" : proc.cpu > 5 ? "bg-yellow-500" : "bg-blue-500";
                const textColor = proc.cpu > 50 ? "text-red-400" : proc.cpu > 20 ? "text-orange-400" : proc.cpu > 5 ? "text-yellow-400" : "text-blue-400";
                return (
                  <div key={idx} className="bg-white/5 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-gray-500 text-xs">{idx + 1}</span>
                        <span className="font-mono text-sm font-semibold truncate">{proc.name}</span>
                        {proc.cores > 1 && (
                          <span className="text-xs text-gray-500 shrink-0">×{proc.cores} cores</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className={`font-bold text-sm ${textColor}`}>{proc.cpu.toFixed(1)}%</span>
                        <span className="text-gray-500 text-xs">moy {proc.avg}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Fallback : afficher les groupes fonctionnels si pas de tasks individuelles */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {diagnostic.dataPlane.groups.map((g: any, idx: number) => {
                const pct = Math.min(g.current, 100);
                const color = g.current > 50 ? "bg-red-500" : g.current > 20 ? "bg-orange-500" : g.current > 5 ? "bg-yellow-500" : "bg-cyan-500";
                const textColor = g.current > 50 ? "text-red-400" : g.current > 20 ? "text-orange-400" : g.current > 5 ? "text-yellow-400" : "text-cyan-400";
                return (
                  <div key={idx} className="bg-white/5 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm font-semibold truncate">{g.name}</span>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className={`font-bold text-sm ${textColor}`}>{g.current.toFixed(1)}%</span>
                        <span className="text-gray-500 text-xs">moy {g.avg}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Légende des processus connus */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-xs text-gray-500 mb-2 font-semibold">Référence des processus DP :</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1 text-xs text-gray-500">
              <span><code className="text-gray-400">pan_task</code> — traitement des paquets</span>
              <span><code className="text-gray-400">pan_comm</code> — communication MP↔DP</span>
              <span><code className="text-gray-400">pan_hdl</code> — gestion des handles</span>
              <span><code className="text-gray-400">flow_lookup</code> — lookup de session</span>
              <span><code className="text-gray-400">app-id</code> — identification applicative</span>
              <span><code className="text-gray-400">content-id</code> — inspection de contenu</span>
            </div>
          </div>
        </Card>
      )}

      {/* Sessions détaillées */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Répartition des sessions */}
        <Card className="bg-white/5 backdrop-blur-sm border-white/10 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Network className="w-5 h-5" />
            Répartition des Sessions
          </h3>
          <div className="space-y-3">
            <SessionBar label="TCP" value={diagnostic.sessions?.activeTCP || 0} total={diagnostic.sessions?.allocated || 1} color="blue" />
            <SessionBar label="UDP" value={diagnostic.sessions?.activeUDP || 0} total={diagnostic.sessions?.allocated || 1} color="green" />
            <SessionBar label="ICMP" value={diagnostic.sessions?.activeICMP || 0} total={diagnostic.sessions?.allocated || 1} color="yellow" />
          </div>
          <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-400">Capacité max</div>
              <div className="font-semibold">{(diagnostic.sessions?.supported || 0).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-400">Utilisées</div>
              <div className="font-semibold">{(diagnostic.sessions?.allocated || 0).toLocaleString()}</div>
            </div>
          </div>
        </Card>

        {/* Top Drops */}
        <Card className="bg-white/5 backdrop-blur-sm border-white/10 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Top Packet Drops
          </h3>
          {diagnostic.counters?.drops?.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {diagnostic.counters.drops.slice(0, 10).map((drop: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-white/5 rounded">
                  <span className="text-sm truncate flex-1">{drop.name}</span>
                  <span className="text-orange-500 font-mono ml-2">{drop.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-green-500 py-8">
              <CheckCircle className="w-8 h-8 mx-auto mb-2" />
              Aucun drop détecté
            </div>
          )}
        </Card>
      </div>

      {/* VPN et GlobalProtect */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* VPN Tunnels */}
        <Card className="bg-white/5 backdrop-blur-sm border-white/10 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Tunnels VPN
          </h3>
          {diagnostic.vpn?.ike?.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {diagnostic.vpn.ike.map((tunnel: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-white/5 rounded">
                  <div>
                    <div className="text-sm font-semibold">{tunnel.name}</div>
                    <div className="text-xs text-gray-400">{tunnel.peer}</div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    tunnel.state?.toLowerCase() === "established" ? "bg-green-500/20 text-green-400" :
                    "bg-red-500/20 text-red-400"
                  }`}>
                    {tunnel.state}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">
              Aucun tunnel VPN configuré
            </div>
          )}
        </Card>

        {/* GlobalProtect */}
        <Card className="bg-white/5 backdrop-blur-sm border-white/10 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            GlobalProtect Users
          </h3>
          <div className="text-center py-4">
            <div className="text-4xl font-bold text-blue-500">
              {diagnostic.globalProtect?.totalUsers || 0}
            </div>
            <div className="text-sm text-gray-400">Utilisateurs connectés</div>
          </div>
          {diagnostic.globalProtect?.users?.length > 0 && (
            <div className="space-y-2 max-h-32 overflow-y-auto mt-4">
              {diagnostic.globalProtect.users.slice(0, 5).map((user: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-white/5 rounded text-sm">
                  <span>{user.username}</span>
                  <span className="text-gray-400">{user.ip}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* System Info */}
      <Card className="bg-white/5 backdrop-blur-sm border-white/10 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Server className="w-5 h-5" />
          Informations Système
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <InfoItem label="Hostname" value={diagnostic.system?.hostname} />
          <InfoItem label="Modèle" value={diagnostic.system?.model} />
          <InfoItem label="Serial" value={diagnostic.system?.serial} />
          <InfoItem label="Version" value={diagnostic.system?.version} />
          <InfoItem label="Uptime" value={diagnostic.system?.uptime} />
        </div>
      </Card>

      {/* Commandes CLI utiles */}
      <Card className="bg-white/5 backdrop-blur-sm border-white/10 p-6">
        <h3 className="text-lg font-semibold mb-4">Commandes CLI pour approfondir</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[
            "show running resource-monitor minute",
            "show counter global filter delta yes severity drop",
            "show session info",
            "show system resources",
            "show high-availability all",
            "debug dataplane pow performance",
          ].map((cmd, idx) => (
            <code key={idx} className="bg-black/30 rounded px-3 py-2 text-sm">
              {cmd}
            </code>
          ))}
        </div>
      </Card>
    </div>
  );
}

// Composants helper
function MetricCard({ title, value, unit, icon: Icon, color, subtitle }: {
  title: string;
  value: number | string;
  unit: string;
  icon: any;
  color: string;
  subtitle?: string;
}) {
  const colorClasses = {
    green: "text-green-500",
    yellow: "text-yellow-500",
    red: "text-red-500",
    blue: "text-blue-500",
  };

  return (
    <Card className="bg-white/5 backdrop-blur-sm border-white/10 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{title}</span>
        <Icon className={`w-5 h-5 ${colorClasses[color as keyof typeof colorClasses] || "text-gray-400"}`} />
      </div>
      <div className={`text-2xl font-bold ${colorClasses[color as keyof typeof colorClasses] || "text-white"}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
        <span className="text-sm font-normal ml-1">{unit}</span>
      </div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </Card>
  );
}

function SessionBar({ label, value, total, color }: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percent = Math.round((value / total) * 100);
  const colorClasses = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    yellow: "bg-yellow-500",
  };

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span>{value.toLocaleString()} ({percent}%)</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colorClasses[color as keyof typeof colorClasses]}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-xs text-gray-400">{label}</div>
      <div className="font-semibold truncate">{value || "N/A"}</div>
    </div>
  );
}
