"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, AlertCircle, Info, CheckCircle, TrendingDown } from "lucide-react";
import type { TSFDataComplete, TSFCounter } from "@/types";
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

interface TSFDropsViewProps {
  data: TSFDataComplete;
}

const dropRecommendations: Record<string, string> = {
  flow_policy_deny: "Vérifier les règles de sécurité pour autoriser le trafic légitime",
  flow_tcp_non_syn: "Vérifier les timeouts de session TCP, possibles sessions expirées",
  flow_no_route: "Vérifier la table de routage et les routes par défaut",
  flow_no_interface: "Vérifier la configuration des interfaces et zones",
  pkt_alloc_failure: "Ressources insuffisantes, vérifier la charge et la mémoire",
  session_discard: "Sessions marquées comme à rejeter par les politiques",
  flow_fwd_l3_noarp: "Problème ARP, vérifier la connectivité L2 et les VLANs",
  flow_dos: "Trafic bloqué par les protections DoS, vérifier les seuils",
  flow_fwd_mtu_exceeded: "Paquets trop grands, vérifier MTU des interfaces et tunnels",
  session_install_error: "Erreur d'installation de session, vérifier les ressources",
};

export default function TSFDropsView({ data }: TSFDropsViewProps) {
  const counters = data.counters;
  const drops = counters?.drops || [];
  const warnings = counters?.warnings || [];
  const top30 = counters?.top30 || [];

  const totalDrops = counters?.totalDrops || 0;
  const criticalCount = counters?.criticalCount || 0;

  const topDrops = drops
    .sort((a, b) => b.value - a.value)
    .slice(0, 15);

  const chartData = topDrops.slice(0, 10).map((d) => ({
    name: d.name.replace(/^(pkt_|flow_|session_)/, "").substring(0, 25),
    fullName: d.name,
    value: d.value,
    rate: d.rate,
  }));

  const categoryData = drops.reduce((acc, d) => {
    const cat = d.category || "other";
    acc[cat] = (acc[cat] || 0) + d.value;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(categoryData)
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({
      name,
      value,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"];

  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      drop: "bg-red-500/20 text-red-400 border-red-500/30",
      warn: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      warning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      info: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    };
    return (
      <Badge variant="outline" className={colors[severity] || colors.info}>
        {severity}
      </Badge>
    );
  };

  const getRecommendation = (name: string): string => {
    for (const [key, rec] of Object.entries(dropRecommendations)) {
      if (name.includes(key)) {
        return rec;
      }
    }
    return "Analyser les logs pour identifier la cause";
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-black/40 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Total Drops
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-400">
              {totalDrops.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Compteurs Critiques
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-400">{criticalCount}</div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-400">{warnings.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Info className="h-4 w-4" />
              Types de Drops
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400">{drops.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Drops Bar Chart */}
        <Card className="bg-black/40 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Top 10 Drops
            </CardTitle>
            <CardDescription>Compteurs de drops les plus élevés</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis type="number" stroke="#888" />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={120}
                      stroke="#888"
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1a1a1a",
                        border: "1px solid #333",
                      }}
                      formatter={(value: number, name: string, props: any) => [
                        `${value.toLocaleString()} (rate: ${props.payload.rate}/s)`,
                        props.payload.fullName,
                      ]}
                    />
                    <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                <CheckCircle className="h-8 w-8 mr-2 text-green-500" />
                Aucun drop significatif
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Pie Chart */}
        <Card className="bg-black/40 border-white/10">
          <CardHeader>
            <CardTitle>Répartition par Catégorie</CardTitle>
            <CardDescription>Distribution des drops par type</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1a1a1a",
                        border: "1px solid #333",
                      }}
                      formatter={(value: number) => [value.toLocaleString(), "Drops"]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Pas de données catégorisées
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Drops Table with Recommendations */}
      <Card className="bg-black/40 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Analyse Détaillée des Drops
          </CardTitle>
          <CardDescription>
            Liste complète avec recommandations de résolution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {topDrops.length > 0 ? (
              <div className="space-y-3">
                {topDrops.map((drop, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg bg-black/30 border border-white/5 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-medium">{drop.name}</span>
                          {getSeverityBadge(drop.severity)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {drop.description || "Pas de description disponible"}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-red-400">
                          {drop.value.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {drop.rate}/s
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant="outline" className="bg-purple-500/10">
                        {drop.category}
                      </Badge>
                      {drop.aspect && (
                        <Badge variant="outline" className="bg-blue-500/10">
                          {drop.aspect}
                        </Badge>
                      )}
                    </div>

                    <div className="mt-2 p-2 bg-green-500/10 rounded border border-green-500/20">
                      <div className="text-xs font-medium text-green-400 mb-1">
                        Recommandation:
                      </div>
                      <div className="text-sm text-green-300">
                        {getRecommendation(drop.name)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                <CheckCircle className="h-8 w-8 mr-2 text-green-500" />
                Aucun drop détecté
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Warnings Section */}
      {warnings.length > 0 && (
        <Card className="bg-black/40 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Avertissements ({warnings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-2">Compteur</th>
                    <th className="text-right p-2">Valeur</th>
                    <th className="text-right p-2">Rate</th>
                    <th className="text-left p-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {warnings
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 30)
                    .map((warn, idx) => (
                      <tr key={idx} className="border-b border-white/5">
                        <td className="p-2 font-mono">{warn.name}</td>
                        <td className="p-2 text-right font-mono">
                          {warn.value.toLocaleString()}
                        </td>
                        <td className="p-2 text-right font-mono">{warn.rate}/s</td>
                        <td className="p-2 text-muted-foreground">{warn.description}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* CLI Commands */}
      <Card className="bg-black/40 border-white/10">
        <CardHeader>
          <CardTitle>Commandes CLI Utiles</CardTitle>
          <CardDescription>
            Commandes pour investiguer les drops sur le firewall
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 font-mono text-sm">
            <div className="p-2 bg-black/50 rounded">
              <span className="text-green-400">$</span> show counter global filter delta yes
            </div>
            <div className="p-2 bg-black/50 rounded">
              <span className="text-green-400">$</span> show counter global filter severity drop
            </div>
            <div className="p-2 bg-black/50 rounded">
              <span className="text-green-400">$</span> show session info
            </div>
            <div className="p-2 bg-black/50 rounded">
              <span className="text-green-400">$</span> show running resource-monitor
            </div>
            <div className="p-2 bg-black/50 rounded">
              <span className="text-green-400">$</span> debug dataplane packet-diag show
              setting
            </div>
            <div className="p-2 bg-black/50 rounded">
              <span className="text-green-400">$</span> show system resources
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
