"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Activity, ArrowDown, ArrowUp, AlertTriangle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InterfaceDataPoint } from "@/app/api/interfaces/history/route";

interface InterfaceDetailChartProps {
  interfaceName: string;
  /** Intervalle de polling en ms (défaut 5000) */
  pollInterval?: number;
}

function formatBps(bps: number): string {
  if (bps >= 1_000_000_000) return `${(bps / 1_000_000_000).toFixed(2)} Gbps`;
  if (bps >= 1_000_000)     return `${(bps / 1_000_000).toFixed(2)} Mbps`;
  if (bps >= 1_000)         return `${(bps / 1_000).toFixed(1)} Kbps`;
  return `${bps} bps`;
}

function formatPps(pps: number): string {
  if (pps >= 1_000_000) return `${(pps / 1_000_000).toFixed(1)}M pps`;
  if (pps >= 1_000)     return `${(pps / 1_000).toFixed(1)}K pps`;
  return `${pps} pps`;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
}

export default function InterfaceDetailChart({
  interfaceName,
  pollInterval = 5000,
}: InterfaceDetailChartProps) {
  const [history, setHistory] = useState<InterfaceDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (paused) return;
    try {
      const res = await fetch(`/api/interfaces/history?name=${encodeURIComponent(interfaceName)}`);
      if (!res.ok) throw new Error("Erreur API");
      const data = await res.json();
      setHistory(data.history ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [interfaceName, paused]);

  useEffect(() => {
    fetchHistory();
    const id = setInterval(fetchHistory, pollInterval);
    return () => clearInterval(id);
  }, [fetchHistory, pollInterval]);

  // Données formatées pour les graphiques
  const chartData = history.map((p) => ({
    time:    formatTime(p.timestamp),
    rxBps:   Math.round((p.rxBps ?? 0) / 1000),   // en Kbps
    txBps:   Math.round((p.txBps ?? 0) / 1000),
    rxPps:   p.rxPps ?? 0,
    txPps:   p.txPps ?? 0,
    rxDrops: p.rxDrops,
    txDrops: p.txDrops,
    rxErrors: p.rxErrors,
    txErrors: p.txErrors,
  }));

  // Dernière valeur pour les cartes de résumé
  const last = history[history.length - 1];
  const prev = history[history.length - 2];

  const currentRxBps = last?.rxBps ?? 0;
  const currentTxBps = last?.txBps ?? 0;
  const currentRxPps = last?.rxPps ?? 0;
  const currentTxPps = last?.txPps ?? 0;
  const totalDrops   = (last?.rxDrops ?? 0) + (last?.txDrops ?? 0);
  const totalErrors  = (last?.rxErrors ?? 0) + (last?.txErrors ?? 0);

  // Tendance (hausse/baisse)
  const rxTrend = prev ? currentRxBps - (prev.rxBps ?? 0) : 0;
  const txTrend = prev ? currentTxBps - (prev.txBps ?? 0) : 0;

  const isUp = history.length > 0; // si on a des données, l'interface répond

  if (loading) {
    return (
      <Card className="bg-white/5 border-white/10 p-8">
        <div className="flex items-center justify-center gap-3 text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Chargement de l&apos;historique…
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-500/10 border-red-500/30 p-6">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isUp
            ? <Wifi className="w-5 h-5 text-green-400" />
            : <WifiOff className="w-5 h-5 text-red-400" />
          }
          <div>
            <h2 className="text-xl font-bold font-mono">{interfaceName}</h2>
            <p className="text-xs text-gray-400">{history.length} points • mise à jour toutes les {pollInterval / 1000}s</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPaused(p => !p)}
          className={paused ? "border-yellow-500/50 text-yellow-400" : ""}
        >
          {paused ? "▶ Reprendre" : "⏸ Pause"}
        </Button>
      </div>

      {/* Cartes de résumé */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          label="RX Débit"
          value={formatBps(currentRxBps)}
          sub={formatPps(currentRxPps)}
          trend={rxTrend}
          icon={<ArrowDown className="w-4 h-4 text-blue-400" />}
          color="blue"
        />
        <SummaryCard
          label="TX Débit"
          value={formatBps(currentTxBps)}
          sub={formatPps(currentTxPps)}
          trend={txTrend}
          icon={<ArrowUp className="w-4 h-4 text-green-400" />}
          color="green"
        />
        <SummaryCard
          label="Drops"
          value={totalDrops.toLocaleString()}
          sub={`RX ${last?.rxDrops ?? 0} / TX ${last?.txDrops ?? 0}`}
          icon={<AlertTriangle className="w-4 h-4 text-orange-400" />}
          color={totalDrops > 0 ? "orange" : "gray"}
        />
        <SummaryCard
          label="Errors"
          value={totalErrors.toLocaleString()}
          sub={`RX ${last?.rxErrors ?? 0} / TX ${last?.txErrors ?? 0}`}
          icon={<Activity className="w-4 h-4 text-red-400" />}
          color={totalErrors > 0 ? "red" : "gray"}
        />
      </div>

      {/* Graphique Throughput RX/TX */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            Débit RX / TX (Kbps)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="rxGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#0072B8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0072B8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="txGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="time" stroke="#555" fontSize={9} interval="preserveStartEnd" />
                <YAxis stroke="#555" fontSize={10} tickFormatter={(v) => `${v}K`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: 12 }}
                  formatter={(v: number, name: string) => [`${v} Kbps`, name === "rxBps" ? "RX" : "TX"]}
                />
                <Legend formatter={(v) => v === "rxBps" ? "RX" : "TX"} />
                <Area type="monotone" dataKey="rxBps" stroke="#0072B8" fill="url(#rxGrad)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="txBps" stroke="#22c55e" fill="url(#txGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Graphique PPS */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-400" />
            Packets par seconde (pps)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="time" stroke="#555" fontSize={9} interval="preserveStartEnd" />
                <YAxis stroke="#555" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: 12 }}
                  formatter={(v: number, name: string) => [formatPps(v), name === "rxPps" ? "RX pps" : "TX pps"]}
                />
                <Legend formatter={(v) => v === "rxPps" ? "RX pps" : "TX pps"} />
                <Line type="monotone" dataKey="rxPps" stroke="#a855f7" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="txPps" stroke="#ec4899" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Graphique Drops & Errors */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            Drops &amp; Errors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="time" stroke="#555" fontSize={9} interval="preserveStartEnd" />
                <YAxis stroke="#555" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: 12 }}
                />
                <Legend />
                <Line type="monotone" dataKey="rxDrops"  stroke="#f97316" strokeWidth={2} dot={false} name="RX Drops" />
                <Line type="monotone" dataKey="txDrops"  stroke="#fb923c" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="TX Drops" />
                <Line type="monotone" dataKey="rxErrors" stroke="#ef4444" strokeWidth={2} dot={false} name="RX Errors" />
                <Line type="monotone" dataKey="txErrors" stroke="#f87171" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="TX Errors" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Carte de résumé
function SummaryCard({
  label, value, sub, trend, icon, color,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: number;
  icon: React.ReactNode;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-400",
    green: "text-green-400",
    orange: "text-orange-400",
    red: "text-red-400",
    gray: "text-gray-400",
  };
  return (
    <Card className="bg-white/5 border-white/10 p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400">{label}</span>
        {icon}
      </div>
      <div className={`text-lg font-bold ${colorMap[color] ?? "text-white"}`}>{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
      {trend !== undefined && trend !== 0 && (
        <div className={`text-xs mt-1 ${trend > 0 ? "text-red-400" : "text-green-400"}`}>
          {trend > 0 ? "▲" : "▼"} {formatBps(Math.abs(trend))}
        </div>
      )}
    </Card>
  );
}
