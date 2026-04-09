"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardMetrics, InterfaceStats } from "@/types";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  Activity, ArrowDown, ArrowUp, AlertTriangle, RefreshCw,
  Wifi, WifiOff, ChevronRight, Search,
} from "lucide-react";
import { SparklineChart } from "@/components/dashboard/SparklineChart";

function formatBps(bps: number): string {
  if (bps >= 1_000_000_000) return `${(bps / 1_000_000_000).toFixed(1)} Gbps`;
  if (bps >= 1_000_000)     return `${(bps / 1_000_000).toFixed(1)} Mbps`;
  if (bps >= 1_000)         return `${(bps / 1_000).toFixed(0)} Kbps`;
  return bps > 0 ? `${bps} bps` : "—";
}

export default function InterfacesPage() {
  const router = useRouter();
  const [interfaces, setInterfaces] = useState<InterfaceStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "up" | "down" | "issues">("all");
  // Historique des débits pour les sparklines (derniers 20 points par interface)
  const [sparkData, setSparkData] = useState<Record<string, number[]>>({});

  useEffect(() => {
    loadInterfaces();
    const id = setInterval(loadInterfaces, 10000);
    return () => clearInterval(id);
  }, []);

  const loadInterfaces = async () => {
    try {
      const res = await fetch("/api/metrics");
      if (!res.ok) { router.push("/"); return; }
      const data: DashboardMetrics = await res.json();
      setInterfaces(data.interfaces ?? []);

      // Envoyer les stats au ring buffer
      if (data.interfaces?.length) {
        fetch("/api/interfaces/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interfaces: data.interfaces }),
        }).catch(() => {});
      }

      // Mettre à jour les sparklines (RX bytes cumulatifs → on garde les deltas)
      setSparkData(prev => {
        const next = { ...prev };
        for (const iface of data.interfaces ?? []) {
          const arr = next[iface.name] ?? [];
          arr.push(iface.rx);
          if (arr.length > 20) arr.shift();
          next[iface.name] = arr;
        }
        return next;
      });
    } catch {
      // silencieux
    } finally {
      setLoading(false);
    }
  };

  const filtered = interfaces.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all"    ? true :
      filter === "up"     ? i.status === "up" :
      filter === "down"   ? i.status === "down" :
      /* issues */          (i.rxErrors > 0 || i.txErrors > 0 || i.rxDrops > 100 || i.txDrops > 100);
    return matchSearch && matchFilter;
  });

  const upCount   = interfaces.filter(i => i.status === "up").length;
  const downCount = interfaces.filter(i => i.status === "down").length;
  const issueCount = interfaces.filter(i => i.rxErrors > 0 || i.txErrors > 0 || i.rxDrops > 100 || i.txDrops > 100).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Interfaces réseau</h1>
            <p className="text-gray-400 text-sm mt-1">
              {interfaces.length} interfaces • {upCount} up • {downCount} down
              {issueCount > 0 && <span className="text-orange-400 ml-2">⚠ {issueCount} avec problèmes</span>}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadInterfaces} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Barre de recherche */}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une interface…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {/* Boutons filtre */}
          {(["all", "up", "down", "issues"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              {f === "all"    ? `Toutes (${interfaces.length})` :
               f === "up"    ? `Up (${upCount})` :
               f === "down"  ? `Down (${downCount})` :
               `Problèmes (${issueCount})`}
            </button>
          ))}
        </div>

        {/* Grille des interfaces */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-32 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(iface => (
              <InterfaceCard
                key={iface.name}
                iface={iface}
                sparkRx={sparkData[iface.name] ?? []}
              />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-3 text-center text-gray-500 py-16">
                Aucune interface trouvée
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function InterfaceCard({ iface, sparkRx }: { iface: InterfaceStats; sparkRx: number[] }) {
  const hasErrors = iface.rxErrors > 0 || iface.txErrors > 0;
  const hasDrops  = iface.rxDrops > 100 || iface.txDrops > 100;
  const isDown    = iface.status === "down";

  const borderColor =
    isDown    ? "border-red-500/50 bg-red-500/5" :
    hasErrors ? "border-orange-500/50 bg-orange-500/5" :
    hasDrops  ? "border-yellow-500/50 bg-yellow-500/5" :
    "border-white/10 bg-white/5";

  // Calcul du débit approximatif depuis les sparklines (dernier delta)
  const rxBps = sparkRx.length >= 2
    ? Math.max(0, sparkRx[sparkRx.length - 1] - sparkRx[sparkRx.length - 2])
    : 0;

  return (
    <Link href={`/dashboard/interfaces/${encodeURIComponent(iface.name)}`}>
      <Card className={`${borderColor} backdrop-blur-sm p-4 hover:bg-white/10 transition-all cursor-pointer group`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            {isDown
              ? <WifiOff className="w-4 h-4 text-red-400 shrink-0" />
              : <Wifi className="w-4 h-4 text-green-400 shrink-0" />
            }
            <span className="font-mono font-semibold text-sm truncate">{iface.name}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              iface.status === "up"   ? "bg-green-500/20 text-green-400" :
              iface.status === "down" ? "bg-red-500/20 text-red-400" :
              "bg-gray-500/20 text-gray-400"
            }`}>
              {iface.status}
            </span>
            <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-300 transition-colors" />
          </div>
        </div>

        {/* Speed */}
        {iface.speed && iface.speed !== "N/A" && (
          <p className="text-xs text-gray-500 mb-2">{iface.speed}</p>
        )}

        {/* Sparkline RX */}
        {sparkRx.length > 2 && (
          <div className="mb-3 h-10">
            <SparklineChart data={sparkRx} color={isDown ? "#ef4444" : "#0072B8"} />
          </div>
        )}

        {/* Métriques */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1 text-blue-400">
            <ArrowDown className="w-3 h-3" />
            <span>{formatBps(rxBps)}</span>
          </div>
          <div className="flex items-center gap-1 text-green-400">
            <ArrowUp className="w-3 h-3" />
            <span>{formatBps(0)}</span>
          </div>
          {(hasErrors || hasDrops) && (
            <div className="col-span-2 flex items-center gap-1 text-orange-400 mt-1">
              <AlertTriangle className="w-3 h-3" />
              <span>
                {hasErrors && `${iface.rxErrors + iface.txErrors} errors`}
                {hasErrors && hasDrops && " · "}
                {hasDrops && `${iface.rxDrops + iface.txDrops} drops`}
              </span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
