"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Cpu,
  Database,
  HardDrive,
  Info,
  Layers,
  Network,
  Shield,
  Activity,
  Server,
  FileText,
  Clock,
} from "lucide-react";
import type { TSFDataComplete, TSFIssue } from "@/types";
import TSFDataPlaneView from "./TSFDataPlaneView";
import TSFDropsView from "./TSFDropsView";

interface TSFAnalysisViewProps {
  data: TSFDataComplete;
}

export default function TSFAnalysisView({ data }: TSFAnalysisViewProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const severityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "major":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const severityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      critical: "bg-red-500/20 text-red-400 border-red-500/30",
      major: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      warning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      info: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    };
    return (
      <Badge variant="outline" className={colors[severity] || colors.info}>
        {severity}
      </Badge>
    );
  };

  const healthScoreColor = (score: number) => {
    if (score >= 90) return "text-green-400";
    if (score >= 70) return "text-yellow-400";
    if (score >= 50) return "text-orange-400";
    return "text-red-400";
  };

  const criticalCount = data.issues?.filter((i) => i.severity === "critical").length || 0;
  const majorCount = data.issues?.filter((i) => i.severity === "major").length || 0;
  const warningCount = data.issues?.filter((i) => i.severity === "warning").length || 0;

  return (
    <div className="space-y-6">
      {/* Header avec Health Score */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-black/40 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <span className={`text-4xl font-bold ${healthScoreColor(data.healthScore)}`}>
                {data.healthScore}
              </span>
              <span className="text-2xl text-muted-foreground">/100</span>
            </div>
            <Progress
              value={data.healthScore}
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Critiques
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-4xl font-bold text-red-400">{criticalCount}</span>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Majeurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-4xl font-bold text-orange-400">{majorCount}</span>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Avertissements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-4xl font-bold text-yellow-400">{warningCount}</span>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-6 lg:grid-cols-9 w-full bg-black/40 border border-white/10">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Vue d'ensemble</span>
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            <span className="hidden sm:inline">Ressources</span>
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Sessions</span>
          </TabsTrigger>
          <TabsTrigger value="drops" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Drops</span>
          </TabsTrigger>
          <TabsTrigger value="network" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            <span className="hidden sm:inline">Réseau</span>
          </TabsTrigger>
          <TabsTrigger value="ha" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">HA</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Logs</span>
          </TabsTrigger>
          <TabsTrigger value="processes" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            <span className="hidden sm:inline">Processus</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            <span className="hidden sm:inline">Système</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* System Info */}
            <Card className="bg-black/40 border-white/10">
              <CardHeader>
                <CardTitle className="text-lg">Informations Système</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hostname</span>
                  <span className="font-mono">{data.system?.hostname || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Modèle</span>
                  <span className="font-mono">{data.system?.model || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Version</span>
                  <span className="font-mono">{data.system?.panosVersion || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Uptime</span>
                  <span className="font-mono">{data.system?.uptime || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Serial</span>
                  <span className="font-mono">{data.system?.serial || "N/A"}</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Metrics */}
            <Card className="bg-black/40 border-white/10">
              <CardHeader>
                <CardTitle className="text-lg">Métriques Clés</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>CPU Data Plane</span>
                    <span>{data.resources?.dataplane?.cpuAverage || 0}%</span>
                  </div>
                  <Progress value={data.resources?.dataplane?.cpuAverage || 0} className="h-2" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>CPU Management</span>
                    <span>{data.resources?.management?.cpu || 0}%</span>
                  </div>
                  <Progress value={data.resources?.management?.cpu || 0} className="h-2" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Mémoire</span>
                    <span>{data.resources?.management?.memory || 0}%</span>
                  </div>
                  <Progress value={data.resources?.management?.memory || 0} className="h-2" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Sessions</span>
                    <span>{data.sessions?.utilization || 0}%</span>
                  </div>
                  <Progress value={data.sessions?.utilization || 0} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Issues */}
          <Card className="bg-black/40 border-white/10">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Problèmes Détectés ({data.issues?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {data.issues && data.issues.length > 0 ? (
                  <div className="space-y-3">
                    {data.issues.map((issue, idx) => (
                      <div
                        key={issue.id || idx}
                        className="p-3 rounded-lg bg-black/30 border border-white/5 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {severityIcon(issue.severity)}
                            <span className="font-medium">{issue.title}</span>
                          </div>
                          {severityBadge(issue.severity)}
                        </div>
                        <p className="text-sm text-muted-foreground">{issue.description}</p>
                        <div className="text-xs space-y-1">
                          <p className="text-yellow-400/80">
                            <strong>Impact:</strong> {issue.impact}
                          </p>
                          <p className="text-green-400/80">
                            <strong>Recommandation:</strong> {issue.recommendation}
                          </p>
                        </div>
                        {issue.evidence && (
                          <pre className="text-xs bg-black/50 p-2 rounded overflow-x-auto">
                            {issue.evidence}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mr-2 text-green-500" />
                    Aucun problème détecté
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources">
          <TSFDataPlaneView data={data} />
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-black/40 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Sessions Supportées</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold">
                  {data.sessions?.supported?.toLocaleString() || "N/A"}
                </span>
              </CardContent>
            </Card>
            <Card className="bg-black/40 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Sessions Allouées</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold">
                  {data.sessions?.allocated?.toLocaleString() || "N/A"}
                </span>
              </CardContent>
            </Card>
            <Card className="bg-black/40 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Utilisation</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold">{data.sessions?.utilization || 0}%</span>
              </CardContent>
            </Card>
            <Card className="bg-black/40 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Packet Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold">
                  {data.sessions?.packetRate?.toLocaleString() || "N/A"}/s
                </span>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-black/40 border-white/10">
            <CardHeader>
              <CardTitle>Répartition des Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-500/10 rounded-lg">
                  <div className="text-3xl font-bold text-blue-400">
                    {data.sessions?.tcp?.toLocaleString() || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">TCP</div>
                </div>
                <div className="text-center p-4 bg-green-500/10 rounded-lg">
                  <div className="text-3xl font-bold text-green-400">
                    {data.sessions?.udp?.toLocaleString() || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">UDP</div>
                </div>
                <div className="text-center p-4 bg-yellow-500/10 rounded-lg">
                  <div className="text-3xl font-bold text-yellow-400">
                    {data.sessions?.icmp?.toLocaleString() || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">ICMP</div>
                </div>
                <div className="text-center p-4 bg-purple-500/10 rounded-lg">
                  <div className="text-3xl font-bold text-purple-400">
                    {data.sessions?.other?.toLocaleString() || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Autres</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-white/10">
            <CardHeader>
              <CardTitle>Métriques de Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Throughput</div>
                  <div className="text-xl font-bold">
                    {((data.sessions?.throughputKbps || 0) / 1000).toFixed(1)} Mbps
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Nouvelles connexions</div>
                  <div className="text-xl font-bold">
                    {data.sessions?.newConnectionRate?.toLocaleString() || 0}/s
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">TCP Half-Open</div>
                  <div className="text-xl font-bold">
                    {data.sessions?.tcpHalfOpen?.toLocaleString() || 0}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Drops Tab */}
        <TabsContent value="drops">
          <TSFDropsView data={data} />
        </TabsContent>

        {/* Network Tab */}
        <TabsContent value="network" className="space-y-4">
          <Card className="bg-black/40 border-white/10">
            <CardHeader>
              <CardTitle>Interfaces ({data.interfaces?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left p-2">Interface</th>
                      <th className="text-left p-2">État</th>
                      <th className="text-left p-2">Vitesse</th>
                      <th className="text-right p-2">RX Errors</th>
                      <th className="text-right p-2">TX Errors</th>
                      <th className="text-right p-2">RX Drops</th>
                      <th className="text-right p-2">TX Drops</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.interfaces?.slice(0, 50).map((iface, idx) => (
                      <tr key={idx} className="border-b border-white/5">
                        <td className="p-2 font-mono">{iface.name}</td>
                        <td className="p-2">
                          <Badge
                            variant="outline"
                            className={
                              iface.status === "up"
                                ? "bg-green-500/20 text-green-400"
                                : "bg-red-500/20 text-red-400"
                            }
                          >
                            {iface.status}
                          </Badge>
                        </td>
                        <td className="p-2">{iface.speed || "N/A"}</td>
                        <td className="p-2 text-right font-mono">
                          {iface.rxErrors?.toLocaleString() || 0}
                        </td>
                        <td className="p-2 text-right font-mono">
                          {iface.txErrors?.toLocaleString() || 0}
                        </td>
                        <td className="p-2 text-right font-mono">
                          {iface.rxDrops?.toLocaleString() || 0}
                        </td>
                        <td className="p-2 text-right font-mono">
                          {iface.txDrops?.toLocaleString() || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* VPN */}
          <Card className="bg-black/40 border-white/10">
            <CardHeader>
              <CardTitle>Tunnels VPN</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">IKE Gateways ({data.vpn?.ikeGateways?.length || 0})</h4>
                  <ScrollArea className="h-[200px]">
                    {data.vpn?.ikeGateways?.slice(0, 20).map((gw, idx) => (
                      <div key={idx} className="flex justify-between p-2 border-b border-white/5">
                        <span className="font-mono text-sm">{gw.name}</span>
                        <span className="text-sm text-muted-foreground">{gw.peerAddress}</span>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
                <div>
                  <h4 className="font-medium mb-2">IKE SAs ({data.vpn?.ikeSa?.length || 0})</h4>
                  <ScrollArea className="h-[200px]">
                    {data.vpn?.ikeSa?.slice(0, 20).map((sa, idx) => (
                      <div key={idx} className="flex justify-between p-2 border-b border-white/5">
                        <span className="font-mono text-sm">{sa.name}</span>
                        <Badge
                          variant="outline"
                          className={
                            sa.state.toLowerCase().includes("established")
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }
                        >
                          {sa.state}
                        </Badge>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HA Tab */}
        <TabsContent value="ha" className="space-y-4">
          <Card className="bg-black/40 border-white/10">
            <CardHeader>
              <CardTitle>État High Availability</CardTitle>
            </CardHeader>
            <CardContent>
              {data.ha?.enabled ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Mode</div>
                      <div className="font-medium">{data.ha.mode}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">État Local</div>
                      <Badge
                        variant="outline"
                        className={
                          data.ha.localState?.toLowerCase() === "active"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }
                      >
                        {data.ha.localState}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">État Peer</div>
                      <Badge
                        variant="outline"
                        className={
                          data.ha.peerState?.toLowerCase() === "passive"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }
                      >
                        {data.ha.peerState}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Sync Config</div>
                      <Badge
                        variant="outline"
                        className={
                          data.ha.configSync?.toLowerCase().includes("complete")
                            ? "bg-green-500/20 text-green-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }
                      >
                        {data.ha.configSync}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="p-3 bg-black/30 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-2">Lien HA1</div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            data.ha.links?.ha1?.status === "up"
                              ? "bg-green-500"
                              : "bg-red-500"
                          }`}
                        />
                        <span>{data.ha.links?.ha1?.status || "N/A"}</span>
                        {data.ha.links?.ha1?.ip && (
                          <span className="text-muted-foreground ml-2">
                            ({data.ha.links.ha1.ip})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-3 bg-black/30 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-2">Lien HA2</div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            data.ha.links?.ha2?.status === "up"
                              ? "bg-green-500"
                              : "bg-red-500"
                          }`}
                        />
                        <span>{data.ha.links?.ha2?.status || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  High Availability non activé
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card className="bg-black/40 border-white/10">
            <CardHeader>
              <CardTitle>Logs Système</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {data.logs?.system && data.logs.system.length > 0 ? (
                  <div className="space-y-1">
                    {data.logs.system.slice(0, 100).map((log, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 p-2 border-b border-white/5 text-sm"
                      >
                        <span className="text-muted-foreground font-mono whitespace-nowrap">
                          {log.timestamp}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            log.severity === "critical"
                              ? "bg-red-500/20 text-red-400"
                              : log.severity === "high"
                              ? "bg-orange-500/20 text-orange-400"
                              : "bg-blue-500/20 text-blue-400"
                          }`}
                        >
                          {log.type}
                        </Badge>
                        <span className="flex-1">{log.description}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Aucun log disponible
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Processes Tab */}
        <TabsContent value="processes" className="space-y-4">
          <Card className="bg-black/40 border-white/10">
            <CardHeader>
              <CardTitle>Processus ({data.processes?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left p-2">PID</th>
                      <th className="text-left p-2">Nom</th>
                      <th className="text-right p-2">CPU %</th>
                      <th className="text-right p-2">Mémoire (KB)</th>
                      <th className="text-left p-2">État</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.processes
                      ?.sort((a, b) => b.cpu - a.cpu)
                      .slice(0, 50)
                      .map((proc, idx) => (
                        <tr key={idx} className="border-b border-white/5">
                          <td className="p-2 font-mono">{proc.pid}</td>
                          <td className="p-2">{proc.name}</td>
                          <td className="p-2 text-right font-mono">{proc.cpu}%</td>
                          <td className="p-2 text-right font-mono">
                            {proc.memoryKb?.toLocaleString() || 0}
                          </td>
                          <td className="p-2">
                            <Badge variant="outline" className="text-xs">
                              {proc.state}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-black/40 border-white/10">
              <CardHeader>
                <CardTitle>Utilisation Disque</CardTitle>
              </CardHeader>
              <CardContent>
                {data.resources?.disk?.partitions?.map((part, idx) => (
                  <div key={idx} className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-mono">{part.mountPoint}</span>
                      <span>{part.usagePercent}%</span>
                    </div>
                    <Progress
                      value={part.usagePercent}
                      className={`h-2 ${
                        part.usagePercent >= 90
                          ? "[&>div]:bg-red-500"
                          : part.usagePercent >= 80
                          ? "[&>div]:bg-yellow-500"
                          : ""
                      }`}
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      {part.used} / {part.size}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-white/10">
              <CardHeader>
                <CardTitle>Licences</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  {data.licenses?.map((license, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center p-2 border-b border-white/5"
                    >
                      <span>{license.feature}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {license.expires}
                        </span>
                        {license.expired && (
                          <Badge variant="outline" className="bg-red-500/20 text-red-400">
                            Expiré
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-black/40 border-white/10">
            <CardHeader>
              <CardTitle>GlobalProtect</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-black/30 rounded-lg">
                  <div className="text-3xl font-bold text-blue-400">
                    {data.globalProtect?.statistics?.currentUsers || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Utilisateurs Connectés</div>
                </div>
                <div className="text-center p-4 bg-black/30 rounded-lg">
                  <div className="text-3xl font-bold text-green-400">
                    {data.globalProtect?.statistics?.previousUsers || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Utilisateurs Précédents</div>
                </div>
                <div className="text-center p-4 bg-black/30 rounded-lg">
                  <div className="text-3xl font-bold text-purple-400">
                    {data.globalProtect?.gateways?.length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Gateways</div>
                </div>
                <div className="text-center p-4 bg-black/30 rounded-lg">
                  <div className="text-3xl font-bold text-yellow-400">
                    {data.globalProtect?.portals?.length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Portals</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
