"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Shield, AlertTriangle, Bug, Globe, Lock, Eye, Activity, Ban, CheckCircle, XCircle } from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
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
  Legend,
} from "recharts";

interface SecurityData {
  threats: {
    total: number;
    blocked: number;
    allowed: number;
    byType: Array<{ name: string; value: number }>;
  };
  sessions: {
    active: number;
    denied: number;
    allowed: number;
  };
  topApplications: Array<{ name: string; sessions: number; bytes: number }>;
  topSources: Array<{ ip: string; country: string; sessions: number; blocked: boolean }>;
  urlFiltering: {
    allowed: number;
    blocked: number;
    categories: Array<{ name: string; count: number }>;
  };
  antivirus: {
    scanned: number;
    detected: number;
    blocked: number;
  };
}

const COLORS = ["#0072B8", "#FF6B35", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444"];

export default function SecurityPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SecurityData | null>(null);
  const [threatHistory, setThreatHistory] = useState<Array<{
    time: string;
    blocked: number;
    allowed: number;
  }>>([]);

  const loadData = async () => {
    try {
      const response = await fetch("/api/metrics");
      if (response.status === 401) {
        router.push("/");
        return;
      }
      
      const metrics = await response.json();
      
      // Simuler des données de sécurité basées sur les métriques
      const securityData: SecurityData = {
        threats: {
          total: Math.floor(Math.random() * 10000) + 1000,
          blocked: Math.floor(Math.random() * 9000) + 800,
          allowed: Math.floor(Math.random() * 500) + 100,
          byType: [
            { name: "Spyware", value: Math.floor(Math.random() * 500) + 100 },
            { name: "Virus", value: Math.floor(Math.random() * 300) + 50 },
            { name: "Vulnerability", value: Math.floor(Math.random() * 200) + 30 },
            { name: "C2", value: Math.floor(Math.random() * 100) + 10 },
            { name: "Malware", value: Math.floor(Math.random() * 400) + 80 },
          ],
        },
        sessions: {
          active: metrics.sessions?.active || 12543,
          denied: Math.floor(Math.random() * 1000) + 100,
          allowed: metrics.sessions?.active || 12543,
        },
        topApplications: [
          { name: "web-browsing", sessions: Math.floor(Math.random() * 5000) + 1000, bytes: Math.floor(Math.random() * 1e10) },
          { name: "ssl", sessions: Math.floor(Math.random() * 4000) + 800, bytes: Math.floor(Math.random() * 1e10) },
          { name: "dns", sessions: Math.floor(Math.random() * 3000) + 500, bytes: Math.floor(Math.random() * 1e9) },
          { name: "office365", sessions: Math.floor(Math.random() * 2000) + 300, bytes: Math.floor(Math.random() * 1e9) },
          { name: "youtube", sessions: Math.floor(Math.random() * 1000) + 100, bytes: Math.floor(Math.random() * 1e10) },
          { name: "google-base", sessions: Math.floor(Math.random() * 800) + 100, bytes: Math.floor(Math.random() * 1e9) },
          { name: "teams", sessions: Math.floor(Math.random() * 600) + 50, bytes: Math.floor(Math.random() * 1e9) },
          { name: "ssh", sessions: Math.floor(Math.random() * 100) + 10, bytes: Math.floor(Math.random() * 1e8) },
        ],
        topSources: [
          { ip: "192.168.1.100", country: "FR", sessions: Math.floor(Math.random() * 500), blocked: false },
          { ip: "10.0.0.50", country: "FR", sessions: Math.floor(Math.random() * 400), blocked: false },
          { ip: "185.220.101.33", country: "RU", sessions: Math.floor(Math.random() * 300), blocked: true },
          { ip: "45.155.205.225", country: "CN", sessions: Math.floor(Math.random() * 200), blocked: true },
          { ip: "192.168.10.25", country: "FR", sessions: Math.floor(Math.random() * 100), blocked: false },
        ],
        urlFiltering: {
          allowed: Math.floor(Math.random() * 50000) + 10000,
          blocked: Math.floor(Math.random() * 5000) + 500,
          categories: [
            { name: "business-and-economy", count: Math.floor(Math.random() * 10000) },
            { name: "computer-and-internet-info", count: Math.floor(Math.random() * 8000) },
            { name: "streaming-media", count: Math.floor(Math.random() * 5000) },
            { name: "social-networking", count: Math.floor(Math.random() * 3000) },
            { name: "malware", count: Math.floor(Math.random() * 500) },
          ],
        },
        antivirus: {
          scanned: Math.floor(Math.random() * 100000) + 50000,
          detected: Math.floor(Math.random() * 100) + 10,
          blocked: Math.floor(Math.random() * 90) + 10,
        },
      };
      
      setData(securityData);
      
      // Ajouter à l'historique
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
      
      setThreatHistory(prev => {
        const newHistory = [...prev, {
          time: timeStr,
          blocked: securityData.threats.blocked,
          allowed: securityData.threats.allowed,
        }];
        return newHistory.slice(-20);
      });
      
    } catch (error) {
      console.error("Erreur chargement security:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    loadData();
  };

  const formatBytes = (bytes: number) => {
    if (bytes >= 1e12) return (bytes / 1e12).toFixed(2) + " TB";
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + " GB";
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(2) + " MB";
    if (bytes >= 1e3) return (bytes / 1e3).toFixed(2) + " KB";
    return bytes + " B";
  };

  return (
    <DashboardLayout onRefresh={handleRefresh} loading={loading}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Sécurité</h1>
          <p className="text-muted-foreground">
            Monitoring des menaces et analyse du trafic
          </p>
        </div>

        {/* Cartes principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Menaces bloquées */}
          <div className="glass rounded-lg p-6 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Menaces Bloquées</span>
            </div>
            <div className="text-4xl font-bold text-green-500 mb-1">
              {data?.threats.blocked?.toLocaleString() || 0}
            </div>
            <div className="text-sm text-muted-foreground">
              {(((data?.threats.blocked || 0) / (data?.threats.total || 1)) * 100).toFixed(1)}% du total
            </div>
          </div>

          {/* Sessions Denied */}
          <div className="glass rounded-lg p-6 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Ban className="w-5 h-5 text-red-500" />
              <span className="text-sm text-muted-foreground">Sessions Refusées</span>
            </div>
            <div className="text-4xl font-bold text-red-500 mb-1">
              {data?.sessions.denied?.toLocaleString() || 0}
            </div>
            <div className="text-sm text-muted-foreground">
              Politique de sécurité
            </div>
          </div>

          {/* URL Blocked */}
          <div className="glass rounded-lg p-6 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-5 h-5 text-paloalto-orange" />
              <span className="text-sm text-muted-foreground">URLs Bloquées</span>
            </div>
            <div className="text-4xl font-bold text-paloalto-orange mb-1">
              {data?.urlFiltering.blocked?.toLocaleString() || 0}
            </div>
            <div className="text-sm text-muted-foreground">
              URL Filtering actif
            </div>
          </div>

          {/* Antivirus */}
          <div className="glass rounded-lg p-6 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Bug className="w-5 h-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">Virus Détectés</span>
            </div>
            <div className="text-4xl font-bold text-purple-500 mb-1">
              {data?.antivirus.detected || 0}
            </div>
            <div className="text-sm text-muted-foreground">
              {data?.antivirus.scanned?.toLocaleString()} fichiers scannés
            </div>
          </div>
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Types de menaces */}
          <div className="glass rounded-lg p-6 border border-white/10">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-paloalto-orange" />
              Types de Menaces
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.threats.byType || []}
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {(data?.threats.byType || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Historique des menaces */}
          <div className="glass rounded-lg p-6 border border-white/10">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-500" />
              Historique Menaces
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={threatHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="time" stroke="#888" fontSize={12} />
                  <YAxis stroke="#888" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a2e",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="blocked"
                    name="Bloquées"
                    stroke="#10b981"
                    fill="url(#blockedGradient)"
                    stackId="1"
                  />
                  <Area
                    type="monotone"
                    dataKey="allowed"
                    name="Autorisées"
                    stroke="#ef4444"
                    fill="url(#allowedGradient)"
                    stackId="1"
                  />
                  <defs>
                    <linearGradient id="blockedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="allowedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Top Applications */}
        <div className="glass rounded-lg p-6 border border-white/10">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5 text-paloalto-blue" />
            Top Applications (App-ID)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Application</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Sessions</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Bytes</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">%</th>
                </tr>
              </thead>
              <tbody>
                {data?.topApplications.map((app, idx) => {
                  const totalSessions = data.topApplications.reduce((sum, a) => sum + a.sessions, 0);
                  const percent = ((app.sessions / totalSessions) * 100).toFixed(1);
                  return (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-4 font-mono">{app.name}</td>
                      <td className="py-3 px-4 text-right">{app.sessions.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-muted-foreground">{formatBytes(app.bytes)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-paloalto-blue"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="text-sm">{percent}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Sources */}
        <div className="glass rounded-lg p-6 border border-white/10">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-paloalto-orange" />
            Top Sources IP
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">IP Source</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Pays</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Sessions</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.topSources.map((source, idx) => (
                  <tr key={idx} className={`border-b border-white/5 hover:bg-white/5 ${source.blocked ? 'bg-red-500/5' : ''}`}>
                    <td className="py-3 px-4 font-mono">{source.ip}</td>
                    <td className="py-3 px-4">{source.country}</td>
                    <td className="py-3 px-4 text-right">{source.sessions.toLocaleString()}</td>
                    <td className="py-3 px-4 text-center">
                      {source.blocked ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-500">
                          <XCircle className="w-3 h-3" />
                          Bloqué
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-500">
                          <CheckCircle className="w-3 h-3" />
                          Autorisé
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* URL Categories */}
        <div className="glass rounded-lg p-6 border border-white/10">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-purple-500" />
            Catégories URL Filtering
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.urlFiltering.categories || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis type="number" stroke="#888" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="#888" fontSize={11} width={150} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a2e",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="count" name="Requêtes" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
