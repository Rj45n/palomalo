"use client";

import { Card } from "@/components/ui/card";
import { AlertTriangle, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface PacketDropsAnalysisProps {
  drops: { name: string; count: number; severity: string; reason: string }[];
}

export function PacketDropsAnalysis({ drops }: PacketDropsAnalysisProps) {
  if (drops.length === 0) {
    return (
      <Card className="bg-white/5 backdrop-blur-sm border-white/10 p-6">
        <div className="flex items-center gap-3 mb-4">
          <TrendingDown className="w-6 h-6 text-green-500" />
          <h2 className="text-xl font-bold">Analyse des Drops de Paquets</h2>
        </div>
        <div className="text-center py-8 text-green-500">
          ✅ Aucun drop de paquets détecté
        </div>
      </Card>
    );
  }

  const topDrops = drops.slice(0, 10);
  const totalDrops = drops.reduce((sum, d) => sum + d.count, 0);

  const chartData = topDrops.map((drop) => ({
    name: drop.name.length > 30 ? drop.name.substring(0, 27) + "..." : drop.name,
    count: drop.count,
    fullName: drop.name,
    reason: drop.reason,
  }));

  const getDropColor = (name: string) => {
    if (name.includes("policy") || name.includes("deny")) return "#ef4444";
    if (name.includes("route")) return "#f97316";
    if (name.includes("zone")) return "#eab308";
    return "#8b5cf6";
  };

  const getDropRecommendation = (name: string, reason: string) => {
    if (name.includes("policy") || reason.includes("policy")) {
      return "Vérifier les règles de sécurité. Ajouter des règles allow si le trafic est légitime.";
    }
    if (name.includes("route") || reason.includes("route")) {
      return "Vérifier la table de routage. Ajouter les routes manquantes.";
    }
    if (name.includes("zone") || reason.includes("zone")) {
      return "Vérifier la configuration des zones et l'assignation des interfaces.";
    }
    if (name.includes("session")) {
      return "Table de sessions saturée. Augmenter la licence ou réduire les timeouts.";
    }
    return "Analyser la cause spécifique avec les commandes CLI ci-dessous.";
  };

  return (
    <Card className="bg-white/5 backdrop-blur-sm border-white/10 p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-orange-500" />
            <div>
              <h2 className="text-xl font-bold">Analyse des Drops de Paquets</h2>
              <p className="text-sm text-gray-400">
                {totalDrops.toLocaleString()} paquets droppés détectés
              </p>
            </div>
          </div>
        </div>

        {/* Graphique */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis type="number" stroke="#888" />
              <YAxis dataKey="name" type="category" stroke="#888" width={150} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(0,0,0,0.9)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                }}
                formatter={(value: number, name: string, props: any) => [
                  `${value.toLocaleString()} drops`,
                  props.payload.fullName,
                ]}
              />
              <Bar dataKey="count" fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Détails des drops */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Top 10 Raisons de Drops</h3>
          <div className="space-y-3">
            {topDrops.map((drop, i) => (
              <div
                key={i}
                className="bg-white/5 rounded-lg p-4 border border-white/10"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-semibold text-orange-400">
                      {drop.name}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      {drop.reason || "Raison non spécifiée"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-orange-500">
                      {drop.count.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">paquets</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="text-sm text-gray-300">
                    <strong>Recommandation :</strong>{" "}
                    {getDropRecommendation(drop.name, drop.reason)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Commandes CLI */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Commandes de Diagnostic</h3>
          <div className="space-y-2">
            <code className="block bg-black/30 rounded px-3 py-2 text-sm">
              show counter global filter delta yes severity drop
            </code>
            <code className="block bg-black/30 rounded px-3 py-2 text-sm">
              show counter global filter packet-filter yes delta yes
            </code>
            <code className="block bg-black/30 rounded px-3 py-2 text-sm">
              show session info
            </code>
            <code className="block bg-black/30 rounded px-3 py-2 text-sm">
              show log traffic direction equal backward
            </code>
          </div>
        </div>

        {/* Explications */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="font-semibold text-blue-400 mb-2">
            💡 Interpréter les drops de paquets
          </div>
          <div className="text-sm text-gray-300 space-y-2">
            <div>
              <strong className="text-red-400">flow_policy_deny :</strong> Paquets bloqués par les règles de sécurité
            </div>
            <div>
              <strong className="text-orange-400">flow_no_route :</strong> Pas de route vers la destination
            </div>
            <div>
              <strong className="text-yellow-400">flow_action_close :</strong> Session fermée normalement
            </div>
            <div>
              <strong className="text-purple-400">session_discard :</strong> Session rejetée (table pleine, timeout, etc.)
            </div>
            <div className="mt-3 pt-3 border-t border-blue-500/30">
              <strong>Note :</strong> Les drops "flow_action_close" sont souvent normaux (fin de connexion).
              Focus sur policy_deny et no_route pour les vrais problèmes.
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
