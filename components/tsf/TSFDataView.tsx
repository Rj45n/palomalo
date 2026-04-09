"use client";

import { useState } from "react";
import { TSFData } from "@/types";
import { 
  Server, Cpu, HardDrive, Activity, AlertTriangle, Shield, FileText, 
  Clock, AlertCircle, XCircle, CheckCircle, ChevronDown, ChevronUp,
  BarChart3, Terminal, Layers
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
} from "recharts";

interface TSFDataViewProps {
  data: TSFData;
}

const COLORS = ["#0072B8", "#FF6B35", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444"];

export default function TSFDataView({ data }: TSFDataViewProps) {
  const [expandedLogs, setExpandedLogs] = useState<"critical" | "errors" | "warnings" | null>(null);

  // Extraire le pourcentage de CPU depuis la string
  const cpuPercent = parseFloat(data.hardware.cpu) || 0;
  
  // Extraire le pourcentage de mémoire
  const memMatch = data.hardware.memory.match(/\((\d+\.?\d*)%\)/);
  const memPercent = memMatch ? parseFloat(memMatch[1]) : 0;
  
  // Extraire le pourcentage de disque
  const diskPercent = parseFloat(data.hardware.disk) || 0;

  // Données pour les graphiques de ressources
  const resourceData = [
    { name: "CPU", value: cpuPercent, fill: "#0072B8" },
    { name: "Memory", value: memPercent, fill: "#FF6B35" },
    { name: "Disk", value: diskPercent, fill: "#10b981" },
  ];

  // Données pour le graphique des logs
  const logsData = [
    { name: "Critiques", count: data.logs.critical.length, fill: "#ef4444" },
    { name: "Erreurs", count: data.logs.errors.length, fill: "#f59e0b" },
    { name: "Warnings", count: data.logs.warnings.length, fill: "#eab308" },
  ];

  // Données pour le graphique des processus (top 10)
  const processData = data.processes.slice(0, 10).map(p => ({
    name: p.name.length > 15 ? p.name.slice(0, 15) + "..." : p.name,
    cpu: p.cpu,
    memory: p.memory,
  }));

  return (
    <div className="space-y-6">
      {/* Header avec score de santé */}
      <div className="glass rounded-lg p-6 border border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Analyse du Tech Support File</h2>
            <p className="text-muted-foreground">{data.metadata.filename}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Score de santé</p>
            <div className="flex items-center gap-2">
              {data.logs.critical.length === 0 && data.logs.errors.length < 10 ? (
                <>
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <span className="text-3xl font-bold text-green-500">Bon</span>
                </>
              ) : data.logs.critical.length > 0 ? (
                <>
                  <XCircle className="w-6 h-6 text-red-500" />
                  <span className="text-3xl font-bold text-red-500">Critique</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-6 h-6 text-orange-500" />
                  <span className="text-3xl font-bold text-orange-500">Attention</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cartes système */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU */}
        <div className="glass rounded-lg p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="w-5 h-5 text-paloalto-blue" />
            <span className="text-sm text-muted-foreground">CPU</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">{data.hardware.cpu || "N/A"}</div>
            <div className="w-16 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  innerRadius="70%"
                  outerRadius="100%"
                  data={[{ value: cpuPercent }]}
                  startAngle={90}
                  endAngle={-270}
                >
                  <RadialBar
                    background
                    dataKey="value"
                    fill={cpuPercent > 80 ? "#ef4444" : cpuPercent > 60 ? "#f59e0b" : "#0072B8"}
                    cornerRadius={10}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Memory */}
        <div className="glass rounded-lg p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-5 h-5 text-paloalto-orange" />
            <span className="text-sm text-muted-foreground">Mémoire</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold">{memPercent.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">{data.hardware.memory}</div>
            </div>
            <div className="w-16 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  innerRadius="70%"
                  outerRadius="100%"
                  data={[{ value: memPercent }]}
                  startAngle={90}
                  endAngle={-270}
                >
                  <RadialBar
                    background
                    dataKey="value"
                    fill={memPercent > 80 ? "#ef4444" : memPercent > 60 ? "#f59e0b" : "#FF6B35"}
                    cornerRadius={10}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Disk */}
        <div className="glass rounded-lg p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive className="w-5 h-5 text-green-500" />
            <span className="text-sm text-muted-foreground">Disque</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">{data.hardware.disk || "N/A"}</div>
            <div className="w-16 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  innerRadius="70%"
                  outerRadius="100%"
                  data={[{ value: diskPercent }]}
                  startAngle={90}
                  endAngle={-270}
                >
                  <RadialBar
                    background
                    dataKey="value"
                    fill={diskPercent > 80 ? "#ef4444" : diskPercent > 60 ? "#f59e0b" : "#10b981"}
                    cornerRadius={10}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Uptime */}
        <div className="glass rounded-lg p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-purple-500" />
            <span className="text-sm text-muted-foreground">Uptime</span>
          </div>
          <div className="text-2xl font-bold">{data.system.uptime}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {data.system.hostname} ({data.system.model})
          </div>
        </div>
      </div>

      {/* Informations système détaillées */}
      <div className="glass rounded-lg p-6 border border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-5 h-5 text-paloalto-blue" />
          <h3 className="text-lg font-semibold">Informations Système</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-3 bg-white/5 rounded-lg">
            <p className="text-xs text-muted-foreground">Hostname</p>
            <p className="font-medium truncate">{data.system.hostname}</p>
          </div>
          <div className="p-3 bg-white/5 rounded-lg">
            <p className="text-xs text-muted-foreground">Modèle</p>
            <p className="font-medium">{data.system.model}</p>
          </div>
          <div className="p-3 bg-white/5 rounded-lg">
            <p className="text-xs text-muted-foreground">Serial</p>
            <p className="font-mono text-sm">{data.system.serial}</p>
          </div>
          <div className="p-3 bg-white/5 rounded-lg">
            <p className="text-xs text-muted-foreground">Version</p>
            <p className="font-medium">{data.system.version}</p>
          </div>
          <div className="p-3 bg-white/5 rounded-lg">
            <p className="text-xs text-muted-foreground">Uploadé le</p>
            <p className="font-medium text-sm">{new Date(data.metadata.uploadedAt).toLocaleString("fr-FR")}</p>
          </div>
          <div className="p-3 bg-white/5 rounded-lg">
            <p className="text-xs text-muted-foreground">Taille TSF</p>
            <p className="font-medium">{(data.metadata.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        </div>
      </div>

      {/* Graphiques principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique des ressources */}
        <div className="glass rounded-lg p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-paloalto-blue" />
            <h3 className="text-lg font-semibold">Utilisation des Ressources</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={resourceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis type="number" domain={[0, 100]} stroke="#888" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="#888" fontSize={12} width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a2e",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, "Utilisation"]}
                />
                <Bar dataKey="value" fill="#0072B8" radius={[0, 4, 4, 0]}>
                  {resourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graphique des logs */}
        <div className="glass rounded-lg p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-paloalto-orange" />
            <h3 className="text-lg font-semibold">Distribution des Logs</h3>
          </div>
          <div className="h-64 flex items-center justify-around">
            <div className="h-full w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={logsData.filter(d => d.count > 0)}
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                    label={({ name, count }) => `${name}: ${count}`}
                  >
                    {logsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-red-500" />
                <span>Critiques: {data.logs.critical.length}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-orange-500" />
                <span>Erreurs: {data.logs.errors.length}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-yellow-500" />
                <span>Warnings: {data.logs.warnings.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Processes avec graphique */}
      {data.processes.length > 0 && (
        <div className="glass rounded-lg p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-paloalto-blue" />
            <h3 className="text-lg font-semibold">Top Processus par CPU</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Graphique */}
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={processData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis type="number" stroke="#888" fontSize={12} />
                  <YAxis dataKey="name" type="category" stroke="#888" fontSize={10} width={100} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a2e",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="cpu" name="CPU %" fill="#0072B8" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="memory" name="Memory %" fill="#FF6B35" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">PID</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Processus</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-muted-foreground">CPU</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-muted-foreground">MEM</th>
                  </tr>
                </thead>
                <tbody>
                  {data.processes.slice(0, 10).map((proc, idx) => (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 px-3 text-sm font-mono">{proc.pid}</td>
                      <td className="py-2 px-3 text-sm font-mono truncate max-w-[150px]">{proc.name}</td>
                      <td className="py-2 px-3 text-right">
                        <span className={`font-medium ${
                          proc.cpu > 50 ? "text-red-500" : proc.cpu > 20 ? "text-orange-500" : "text-green-500"
                        }`}>
                          {proc.cpu.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right text-muted-foreground">
                        {proc.memory.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Logs détaillés */}
      <div className="glass rounded-lg p-6 border border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <Terminal className="w-5 h-5 text-paloalto-orange" />
          <h3 className="text-lg font-semibold">Logs Système</h3>
        </div>
        
        <div className="space-y-4">
          {/* Logs Critiques */}
          {data.logs.critical.length > 0 && (
            <div className="border border-red-500/30 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedLogs(expandedLogs === "critical" ? null : "critical")}
                className="w-full flex items-center justify-between p-4 bg-red-500/10 hover:bg-red-500/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="font-medium text-red-500">
                    Logs Critiques ({data.logs.critical.length})
                  </span>
                </div>
                {expandedLogs === "critical" ? (
                  <ChevronUp className="w-5 h-5 text-red-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-red-500" />
                )}
              </button>
              {expandedLogs === "critical" && (
                <div className="max-h-80 overflow-y-auto p-4 space-y-2">
                  {data.logs.critical.map((log, idx) => (
                    <div key={idx} className="text-xs font-mono text-red-400 bg-red-500/5 p-3 rounded border border-red-500/20">
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Logs Erreurs */}
          {data.logs.errors.length > 0 && (
            <div className="border border-orange-500/30 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedLogs(expandedLogs === "errors" ? null : "errors")}
                className="w-full flex items-center justify-between p-4 bg-orange-500/10 hover:bg-orange-500/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                  <span className="font-medium text-orange-500">
                    Erreurs ({data.logs.errors.length})
                  </span>
                </div>
                {expandedLogs === "errors" ? (
                  <ChevronUp className="w-5 h-5 text-orange-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-orange-500" />
                )}
              </button>
              {expandedLogs === "errors" && (
                <div className="max-h-80 overflow-y-auto p-4 space-y-2">
                  {data.logs.errors.map((log, idx) => (
                    <div key={idx} className="text-xs font-mono text-orange-400 bg-orange-500/5 p-3 rounded border border-orange-500/20">
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Logs Warnings */}
          {data.logs.warnings.length > 0 && (
            <div className="border border-yellow-500/30 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedLogs(expandedLogs === "warnings" ? null : "warnings")}
                className="w-full flex items-center justify-between p-4 bg-yellow-500/10 hover:bg-yellow-500/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  <span className="font-medium text-yellow-500">
                    Warnings ({data.logs.warnings.length})
                  </span>
                </div>
                {expandedLogs === "warnings" ? (
                  <ChevronUp className="w-5 h-5 text-yellow-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-yellow-500" />
                )}
              </button>
              {expandedLogs === "warnings" && (
                <div className="max-h-80 overflow-y-auto p-4 space-y-2">
                  {data.logs.warnings.map((log, idx) => (
                    <div key={idx} className="text-xs font-mono text-yellow-400 bg-yellow-500/5 p-3 rounded border border-yellow-500/20">
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Message si pas de logs */}
          {data.logs.critical.length === 0 && data.logs.errors.length === 0 && data.logs.warnings.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p>Aucun log d'erreur détecté dans ce TSF</p>
            </div>
          )}
        </div>
      </div>

      {/* HA Status */}
      {data.ha && data.ha.enabled && (
        <div className="glass rounded-lg p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-paloalto-blue" />
            <h3 className="text-lg font-semibold">High Availability</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white/5 rounded-lg">
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="text-xl font-bold text-green-500">Activé</p>
            </div>
            <div className="p-4 bg-white/5 rounded-lg">
              <p className="text-sm text-muted-foreground">État</p>
              <p className="text-xl font-bold">{data.ha.state}</p>
            </div>
            {data.ha.peer && (
              <div className="p-4 bg-white/5 rounded-lg">
                <p className="text-sm text-muted-foreground">Peer</p>
                <p className="text-xl font-mono">{data.ha.peer}</p>
              </div>
            )}
            {data.ha.syncStatus && (
              <div className="p-4 bg-white/5 rounded-lg">
                <p className="text-sm text-muted-foreground">Sync</p>
                <p className={`text-xl font-bold ${data.ha.syncStatus === "synchronized" ? "text-green-500" : "text-red-500"}`}>
                  {data.ha.syncStatus}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Licenses */}
      {data.licenses.length > 0 && (
        <div className="glass rounded-lg p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-paloalto-blue" />
            <h3 className="text-lg font-semibold">Licenses</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.licenses.map((lic, idx) => (
              <div 
                key={idx} 
                className={`p-4 rounded-lg border ${
                  lic.status === "expired" 
                    ? "bg-red-500/10 border-red-500/30" 
                    : "bg-green-500/10 border-green-500/30"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{lic.feature}</span>
                  {lic.status === "expired" ? (
                    <XCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Expire: {lic.expires}</p>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                  lic.status === "expired"
                    ? "bg-red-500/20 text-red-500"
                    : "bg-green-500/20 text-green-500"
                }`}>
                  {lic.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sessions Info */}
      {data.sessions && data.sessions.max > 0 && (
        <div className="glass rounded-lg p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-semibold">Sessions</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white/5 rounded-lg">
              <p className="text-sm text-muted-foreground">Sessions Actives</p>
              <p className="text-3xl font-bold text-green-500">{data.sessions.current.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-white/5 rounded-lg">
              <p className="text-sm text-muted-foreground">Maximum</p>
              <p className="text-3xl font-bold">{data.sessions.max.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-white/5 rounded-lg">
              <p className="text-sm text-muted-foreground">Utilisation</p>
              <p className="text-3xl font-bold">
                {((data.sessions.current / data.sessions.max) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
