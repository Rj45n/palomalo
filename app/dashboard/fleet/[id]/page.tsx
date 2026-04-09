"use client";
import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FirewallEntrySafe, FirewallSnapshot } from "@/types";
import {
  ChevronLeft, RefreshCw, Wifi, WifiOff, AlertTriangle,
  Cpu, HardDrive, Network, Server, Clock, Tag, Globe
} from "lucide-react";

function HealthScore({ score }: { score: number }) {
  const color = score >= 80 ? "text-green-400" : score >= 50 ? "text-yellow-400" : "text-red-400";
  const ring  = score >= 80 ? "border-green-500/40" : score >= 50 ? "border-yellow-500/40" : "border-red-500/40";
  return (
    <div className={`w-24 h-24 rounded-full border-4 ${ring} flex flex-col items-center justify-center`}>
      <span className={`text-3xl font-bold ${color}`}>{score}</span>
      <span className="text-xs text-gray-400">/ 100</span>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, warn }: { label: string; value: string; icon: React.ElementType; warn?: boolean }) {
  return (
    <Card className="bg-white/5 border-white/10 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400">{label}</span>
        <Icon className={`w-4 h-4 ${warn ? "text-red-400" : "text-gray-500"}`} />
      </div>
      <div className={`text-2xl font-bold ${warn ? "text-red-400" : "text-white"}`}>{value}</div>
    </Card>
  );
}

export default function FleetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [fw, setFw]           = useState<FirewallEntrySafe | null>(null);
  const [snap, setSnap]       = useState<FirewallSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [notFound, setNotFound]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fwRes, snapRes] = await Promise.all([
        fetch(`/api/fleet/${id}`),
        fetch(`/api/fleet/${id}/metrics`),
      ]);
      if (fwRes.status === 404) { setNotFound(true); return; }
      if (fwRes.ok) setFw(await fwRes.json());
      if (snapRes.ok) setSnap(await snapRes.json());
    } finally {
      setLoading(false);
    }
  }, [id]);

  const collect = async () => {
    setCollecting(true);
    const res = await fetch(`/api/fleet/${id}/metrics`, { method: "POST" });
    if (res.ok) setSnap(await res.json());
    setCollecting(false);
  };

  useEffect(() => { load(); }, [load]);

  if (loading)  return <DashboardLayout><div className="text-gray-400 p-8 animate-pulse">Chargement…</div></DashboardLayout>;
  if (notFound) return <DashboardLayout><div className="text-red-400 p-8">Firewall introuvable.</div></DashboardLayout>;
  if (!fw)      return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link href="/dashboard/fleet" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" /> Fleet
          </Link>
          <Button variant="outline" size="sm" onClick={collect} disabled={collecting}>
            <RefreshCw className={`w-4 h-4 mr-2 ${collecting ? "animate-spin" : ""}`} />
            {collecting ? "Collecte…" : "Actualiser"}
          </Button>
        </div>

        {/* Header firewall */}
        <Card className="bg-white/5 border-white/10 p-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                {snap?.status === "online"   && <Wifi className="w-5 h-5 text-green-400" />}
                {snap?.status === "offline"  && <WifiOff className="w-5 h-5 text-red-400" />}
                {snap?.status === "degraded" && <AlertTriangle className="w-5 h-5 text-yellow-400" />}
                {(!snap || snap.status === "unknown") && <Server className="w-5 h-5 text-gray-400" />}
                <h1 className="text-xl font-bold">{fw.label}</h1>
                {fw.tags?.map(tag => (
                  <span key={tag} className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">{tag}</span>
                ))}
              </div>
              <div className="mt-3 space-y-1 text-sm text-gray-400">
                <div className="flex items-center gap-2"><Globe className="w-3.5 h-3.5" />{fw.url}</div>
                {snap && snap.hostname !== fw.label && (
                  <div className="flex items-center gap-2"><Server className="w-3.5 h-3.5" />{snap.hostname} · {snap.model} · PAN-OS {snap.version}</div>
                )}
                {snap && (
                  <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" />
                    Uptime : {snap.uptime} · Collecté le {new Date(snap.collectedAt).toLocaleString("fr-FR")}
                  </div>
                )}
                {fw.tags && fw.tags.length > 0 && (
                  <div className="flex items-center gap-2"><Tag className="w-3.5 h-3.5" />{fw.tags.join(", ")}</div>
                )}
              </div>
            </div>
            {snap && <HealthScore score={snap.healthScore} />}
          </div>
        </Card>

        {/* Métriques */}
        {snap && snap.status !== "offline" ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard label="DP CPU moyen"  value={`${snap.dpCpuAvg}%`}       icon={Cpu}       warn={snap.dpCpuAvg > 80} />
              <MetricCard label="MP CPU"        value={`${snap.mpCpu}%`}           icon={Cpu}       warn={snap.mpCpu > 70} />
              <MetricCard label="Mémoire"       value={`${snap.memoryPct}%`}       icon={HardDrive} warn={snap.memoryPct > 85} />
              <MetricCard label="Sessions"      value={`${snap.sessionUtilPct}%`}  icon={Network}   warn={snap.sessionUtilPct > 80} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <MetricCard label="Sessions actives" value={snap.sessionCount.toLocaleString()} icon={Network} />
              <MetricCard label="Interfaces DOWN"  value={snap.interfacesDown.toString()} icon={WifiOff} warn={snap.interfacesDown > 0} />
              <MetricCard label="Issues critiques" value={snap.criticalIssues.toString()}  icon={AlertTriangle} warn={snap.criticalIssues > 0} />
            </div>

            {/* Résumé issues */}
            {(snap.criticalIssues > 0 || snap.majorIssues > 0) && (
              <Card className="bg-red-500/5 border-red-500/20 p-5">
                <h3 className="font-semibold text-red-400 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Problèmes détectés
                </h3>
                <div className="flex gap-4 text-sm">
                  {snap.criticalIssues > 0 && (
                    <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-full">
                      {snap.criticalIssues} critique(s)
                    </span>
                  )}
                  {snap.majorIssues > 0 && (
                    <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 px-3 py-1 rounded-full">
                      {snap.majorIssues} majeur(s)
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Pour un diagnostic complet, connectez-vous directement à ce firewall depuis la page de connexion.
                </p>
              </Card>
            )}
          </>
        ) : snap?.status === "offline" ? (
          <Card className="bg-red-500/5 border-red-500/20 p-8 text-center">
            <WifiOff className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-red-400 font-semibold">Firewall hors ligne</p>
            {snap.error && <p className="text-gray-400 text-sm mt-2">{snap.error}</p>}
            <Button variant="outline" size="sm" className="mt-4" onClick={collect} disabled={collecting}>
              <RefreshCw className={`w-4 h-4 mr-2 ${collecting ? "animate-spin" : ""}`} />
              Réessayer
            </Button>
          </Card>
        ) : (
          <Card className="bg-white/5 border-white/10 p-8 text-center text-gray-500">
            <Server className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>Aucune métrique collectée.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={collect} disabled={collecting}>
              <RefreshCw className={`w-4 h-4 mr-2 ${collecting ? "animate-spin" : ""}`} />
              Collecter maintenant
            </Button>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
