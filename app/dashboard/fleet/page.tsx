"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FleetSummary, FirewallEntrySafe, FirewallSnapshot } from "@/types";
import {
  Plus, RefreshCw, Wifi, WifiOff, AlertTriangle, CheckCircle,
  ChevronRight, Trash2, Server, Cpu, HardDrive, Network, X,
  Tag, Globe, User, Lock, Edit3
} from "lucide-react";

// ── Composants locaux ────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const cls =
    status === "online"   ? "bg-green-400 shadow-green-400/50" :
    status === "offline"  ? "bg-red-400 shadow-red-400/50" :
    status === "degraded" ? "bg-yellow-400 shadow-yellow-400/50" :
    "bg-gray-400";
  return <span className={`inline-block w-2.5 h-2.5 rounded-full shadow-lg ${cls}`} />;
}

function HealthBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="w-full bg-white/10 rounded-full h-1.5">
      <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
    </div>
  );
}

function StatPill({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`text-sm font-bold ${warn ? "text-red-400" : "text-white"}`}>{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

// ── Modal d'ajout / édition ──────────────────────────────────────────────────

interface FirewallFormData {
  label: string; url: string; username: string; password: string; tags: string;
}

function FirewallModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: Partial<FirewallFormData>;
  onClose: () => void;
  onSave: (data: FirewallFormData) => Promise<void>;
}) {
  const [form, setForm]     = useState<FirewallFormData>({ label: "", url: "", username: "admin", password: "", tags: "", ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label || !form.url || !form.username || !form.password) {
      setError("Tous les champs obligatoires doivent être remplis.");
      return;
    }
    setSaving(true);
    try { await onSave(form); }
    catch (err) { setError(err instanceof Error ? err.message : "Erreur"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="bg-gray-900 border-white/10 p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">{initial ? "Modifier le firewall" : "Ajouter un firewall"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {[
            { key: "label",    label: "Nom affiché",  icon: Tag,    placeholder: "FW-Paris-01",             type: "text" },
            { key: "url",      label: "URL / IP",     icon: Globe,  placeholder: "https://192.168.1.1",     type: "url" },
            { key: "username", label: "Username",     icon: User,   placeholder: "admin",                   type: "text" },
            { key: "password", label: "Password",     icon: Lock,   placeholder: "••••••••",                type: "password" },
            { key: "tags",     label: "Tags (virgule)", icon: Tag,  placeholder: "prod, paris, edge",       type: "text" },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                <f.icon className="w-3 h-3" /> {f.label}
                {f.key !== "tags" && <span className="text-red-400 ml-0.5">*</span>}
              </label>
              <input
                type={f.type}
                value={form[f.key as keyof FirewallFormData]}
                onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          ))}
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Annuler</Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? "Sauvegarde…" : "Sauvegarder"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ── Page principale ──────────────────────────────────────────────────────────

export default function FleetPage() {
  const [summary, setSummary]   = useState<FleetSummary | null>(null);
  const [loading, setLoading]   = useState(true);
  const [polling, setPolling]   = useState(false);
  const [showAdd, setShowAdd]   = useState(false);
  const [editFw, setEditFw]     = useState<FirewallEntrySafe | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/fleet");
      if (res.ok) setSummary(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  const pollAll = async () => {
    setPolling(true);
    await fetch("/api/fleet/poll", { method: "POST" });
    await load();
    setPolling(false);
  };

  const addFirewall = async (data: { label: string; url: string; username: string; password: string; tags: string }) => {
    const res = await fetch("/api/fleet", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ ...data, tags: data.tags.split(",").map(t => t.trim()).filter(Boolean) }),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
    setShowAdd(false);
    await load();
  };

  const editFirewall = async (data: { label: string; url: string; username: string; password: string; tags: string }) => {
    if (!editFw) return;
    const res = await fetch(`/api/fleet/${editFw.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ ...data, tags: data.tags.split(",").map(t => t.trim()).filter(Boolean) }),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
    setEditFw(null);
    await load();
  };

  const removeFirewall = async (id: string) => {
    await fetch(`/api/fleet/${id}`, { method: "DELETE" });
    await load();
  };

  useEffect(() => { load(); }, [load]);

  const snap = (id: string): FirewallSnapshot | undefined => summary?.snapshots[id];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Fleet — Multi-Firewall</h1>
            <p className="text-gray-400 text-sm mt-1">
              {summary ? `${summary.total} firewall(s) · ${summary.online} en ligne · ${summary.offline} hors ligne` : "Chargement…"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={pollAll} disabled={polling || loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${polling ? "animate-spin" : ""}`} />
              {polling ? "Collecte…" : "Actualiser tout"}
            </Button>
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4 mr-2" /> Ajouter
            </Button>
          </div>
        </div>

        {/* Résumé global */}
        {summary && summary.total > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "Total",     value: summary.total,          icon: Server,       color: "text-white" },
              { label: "En ligne",  value: summary.online,         icon: Wifi,         color: "text-green-400" },
              { label: "Dégradés",  value: summary.degraded,       icon: AlertTriangle, color: "text-yellow-400" },
              { label: "Hors ligne", value: summary.offline,       icon: WifiOff,      color: "text-red-400" },
              { label: "Health moy", value: `${summary.avgHealthScore}%`, icon: CheckCircle, color: summary.avgHealthScore >= 80 ? "text-green-400" : summary.avgHealthScore >= 50 ? "text-yellow-400" : "text-red-400" },
            ].map(s => (
              <Card key={s.label} className="bg-white/5 border-white/10 p-4 flex items-center gap-3">
                <s.icon className={`w-8 h-8 ${s.color} shrink-0`} />
                <div>
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-gray-400">{s.label}</div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Liste des firewalls */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !summary || summary.total === 0 ? (
          <Card className="bg-white/5 border-white/10 p-12 text-center text-gray-500">
            <Server className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg">Aucun firewall configuré</p>
            <p className="text-sm mt-1 mb-6">Ajoutez votre premier firewall pour commencer le monitoring multi-site.</p>
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4 mr-2" /> Ajouter un firewall
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {summary.firewalls.map(fw => {
              const s = snap(fw.id);
              return (
                <Card key={fw.id} className="bg-white/5 border-white/10 p-5 hover:bg-white/[0.08] transition-all">
                  <div className="flex items-center gap-4">
                    {/* Status + infos */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <StatusDot status={fw.status} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{fw.label}</span>
                          {s && <span className="text-gray-500 text-xs font-mono">{s.hostname}</span>}
                          {s && <span className="text-gray-600 text-xs">{s.model}</span>}
                          {fw.tags?.map(tag => (
                            <span key={tag} className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">{tag}</span>
                          ))}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{fw.url}</div>
                        {s && (
                          <div className="mt-2">
                            <HealthBar score={s.healthScore} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Métriques */}
                    {s && s.status !== "offline" ? (
                      <div className="hidden md:flex items-center gap-6 shrink-0">
                        <StatPill label="Health"   value={`${s.healthScore}%`} warn={s.healthScore < 50} />
                        <StatPill label="DP CPU"   value={`${s.dpCpuAvg}%`}   warn={s.dpCpuAvg > 80} />
                        <StatPill label="Mémoire"  value={`${s.memoryPct}%`}   warn={s.memoryPct > 85} />
                        <StatPill label="Sessions" value={`${s.sessionUtilPct}%`} warn={s.sessionUtilPct > 80} />
                        {s.criticalIssues > 0 && (
                          <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded-full font-medium">
                            {s.criticalIssues} critique(s)
                          </span>
                        )}
                      </div>
                    ) : s?.status === "offline" ? (
                      <div className="hidden md:flex items-center gap-2 text-red-400 text-sm shrink-0">
                        <WifiOff className="w-4 h-4" />
                        {s.error ? <span className="text-xs max-w-40 truncate" title={s.error}>{s.error}</span> : "Hors ligne"}
                      </div>
                    ) : (
                      <div className="hidden md:flex text-gray-500 text-xs shrink-0">Non collecté</div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          await fetch(`/api/fleet/${fw.id}/metrics`, { method: "POST" });
                          await load();
                        }}
                        title="Collecter les métriques"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </Button>
                      <Link href={`/dashboard/fleet/${fw.id}`}>
                        <Button variant="outline" size="sm">
                          Détail <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditFw(fw)}
                        className="text-gray-400 hover:text-white"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFirewall(fw.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Métriques mobile */}
                  {s && s.status !== "offline" && (
                    <div className="flex md:hidden items-center gap-4 mt-3 pt-3 border-t border-white/5">
                      <StatPill label="Health"   value={`${s.healthScore}%`} warn={s.healthScore < 50} />
                      <StatPill label="DP CPU"   value={`${s.dpCpuAvg}%`}   warn={s.dpCpuAvg > 80} />
                      <StatPill label="Mémoire"  value={`${s.memoryPct}%`}   warn={s.memoryPct > 85} />
                      <StatPill label="Sessions" value={`${s.sessionUtilPct}%`} warn={s.sessionUtilPct > 80} />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAdd && (
        <FirewallModal onClose={() => setShowAdd(false)} onSave={addFirewall} />
      )}
      {editFw && (
        <FirewallModal
          initial={{ label: editFw.label, url: editFw.url, username: editFw.username, tags: (editFw.tags ?? []).join(", ") }}
          onClose={() => setEditFw(null)}
          onSave={editFirewall}
        />
      )}
    </DashboardLayout>
  );
}
