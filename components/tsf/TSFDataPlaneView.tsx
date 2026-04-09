"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Cpu, Activity, Layers, Database, Server } from "lucide-react";
import type { TSFDataComplete } from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";

interface TSFDataPlaneViewProps {
  data: TSFDataComplete;
}

export default function TSFDataPlaneView({ data }: TSFDataPlaneViewProps) {
  const cpuByCore = data.resources?.dataplane?.cpuByCore || [];
  const cpuByGroup = data.resources?.dataplane?.cpuByGroup || [];
  const management = data.resources?.management;
  const dataplane = data.resources?.dataplane;

  const getCPUColor = (value: number): string => {
    if (value >= 90) return "#ef4444";
    if (value >= 75) return "#f97316";
    if (value >= 50) return "#eab308";
    return "#22c55e";
  };

  const coreChartData = cpuByCore
    .filter((c) => c.coreId !== 0)
    .map((c) => ({
      name: `C${c.coreId}`,
      value: c.usage,
      fill: getCPUColor(c.usage),
    }));

  const groupChartData = cpuByGroup
    .filter((g) => g.usage > 0)
    .sort((a, b) => b.usage - a.usage)
    .slice(0, 10)
    .map((g) => ({
      name: g.name.replace("flow_", "").replace("_", " "),
      value: g.usage,
    }));

  const hotCores = cpuByCore.filter((c) => c.coreId !== 0 && c.usage >= 90);
  const avgCPU = dataplane?.cpuAverage || 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-black/40 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              CPU Data Plane
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" style={{ color: getCPUColor(avgCPU) }}>
              {avgCPU}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Moyenne des {cpuByCore.filter((c) => c.coreId !== 0).length} cores
            </p>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Server className="h-4 w-4" />
              CPU Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="text-3xl font-bold"
              style={{ color: getCPUColor(management?.cpu || 0) }}
            >
              {management?.cpu || 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Management Plane</p>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Database className="h-4 w-4" />
              Mémoire
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="text-3xl font-bold"
              style={{ color: getCPUColor(management?.memory || 0) }}
            >
              {management?.memory || 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {management?.memoryUsed
                ? `${Math.round(management.memoryUsed / 1024 / 1024)} GB utilisés`
                : "N/A"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Cores Critiques
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="text-3xl font-bold"
              style={{ color: hotCores.length > 0 ? "#ef4444" : "#22c55e" }}
            >
              {hotCores.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {hotCores.length > 0
                ? `Cores: ${hotCores.map((c) => c.coreId).join(", ")}`
                : "Aucun core saturé"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* CPU by Core Chart */}
      <Card className="bg-black/40 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            CPU par Core Data Plane
          </CardTitle>
          <CardDescription>
            Utilisation CPU pour chaque core du Data Plane (Core 0 = Management, exclu)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {coreChartData.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={coreChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis type="number" domain={[0, 100]} stroke="#888" />
                  <YAxis dataKey="name" type="category" width={40} stroke="#888" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #333",
                    }}
                    formatter={(value: number) => [`${value}%`, "CPU"]}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {coreChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              Données CPU par core non disponibles
            </div>
          )}
        </CardContent>
      </Card>

      {/* CPU by Group */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-black/40 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              CPU par Groupe Fonctionnel
            </CardTitle>
            <CardDescription>
              Répartition de la charge CPU par fonction du Data Plane
            </CardDescription>
          </CardHeader>
          <CardContent>
            {groupChartData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={groupChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      dataKey="name"
                      stroke="#888"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis domain={[0, 100]} stroke="#888" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1a1a1a",
                        border: "1px solid #333",
                      }}
                      formatter={(value: number) => [`${value}%`, "CPU"]}
                    />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Données CPU par groupe non disponibles
              </div>
            )}
          </CardContent>
        </Card>

        {/* All Groups List */}
        <Card className="bg-black/40 border-white/10">
          <CardHeader>
            <CardTitle>Tous les Groupes Fonctionnels</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {cpuByGroup.length > 0 ? (
                <div className="space-y-2">
                  {cpuByGroup
                    .sort((a, b) => b.usage - a.usage)
                    .map((group, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-mono">{group.name}</span>
                          <span style={{ color: getCPUColor(group.usage) }}>
                            {group.usage}%
                          </span>
                        </div>
                        <Progress
                          value={group.usage}
                          className="h-1.5"
                          style={
                            {
                              "--progress-background": getCPUColor(group.usage),
                            } as React.CSSProperties
                          }
                        />
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Données non disponibles
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Resource Utilization */}
      <Card className="bg-black/40 border-white/10">
        <CardHeader>
          <CardTitle>Utilisation des Ressources Data Plane</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Session Utilization</span>
                <span>{dataplane?.sessionUtilization || 0}%</span>
              </div>
              <Progress value={dataplane?.sessionUtilization || 0} className="h-3" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Packet Buffer</span>
                <span>{dataplane?.packetBufferUsage || 0}%</span>
              </div>
              <Progress value={dataplane?.packetBufferUsage || 0} className="h-3" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Packet Descriptor</span>
                <span>{dataplane?.packetDescriptorUsage || 0}%</span>
              </div>
              <Progress value={dataplane?.packetDescriptorUsage || 0} className="h-3" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Load Average */}
      <Card className="bg-black/40 border-white/10">
        <CardHeader>
          <CardTitle>Load Average Management Plane</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-8">
            {management?.loadAverage?.map((load, idx) => (
              <div key={idx} className="text-center">
                <div className="text-3xl font-bold">{load.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">
                  {idx === 0 ? "1 min" : idx === 1 ? "5 min" : "15 min"}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
