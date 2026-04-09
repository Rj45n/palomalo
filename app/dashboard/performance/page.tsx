"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Cpu, MemoryStick, Activity, Gauge, TrendingUp, TrendingDown, Zap, HardDrive } from "lucide-react";
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
} from "recharts";

interface PerformanceData {
  cpu: number;
  memory: number;
  disk: number;
  load: number[];
  sessions: {
    active: number;
    max: number;
    rate: number;
  };
  throughput: {
    rx: number;
    tx: number;
  };
  dataplane: {
    cpu: number;
    packets: number;
  };
  managementPlane: {
    cpu: number;
    memory: number;
  };
}

const COLORS = ["#0072B8", "#FF6B35", "#10b981", "#8b5cf6"];

export default function PerformancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PerformanceData | null>(null);
  const [previousBytes, setPreviousBytes] = useState<{ rx: number; tx: number; timestamp: number } | null>(null);
  const [history, setHistory] = useState<Array<{
    time: string;
    cpu: number;
    memory: number;
    sessions: number;
    throughput: number;
  }>>([]);

  const loadData = async () => {
    try {
      const response = await fetch("/api/metrics");
      if (response.status === 401) {
        router.push("/");
        return;
      }
      
      const metrics = await response.json();
      
      // Calculer le throughput réel (bytes/sec)
      const currentRxBytes = metrics.interfaces?.reduce((sum: number, i: any) => sum + (i.rx || 0), 0) || 0;
      const currentTxBytes = metrics.interfaces?.reduce((sum: number, i: any) => sum + (i.tx || 0), 0) || 0;
      const currentTimestamp = Date.now();
      
      let rxBytesPerSec = 0;
      let txBytesPerSec = 0;
      
      if (previousBytes) {
        const timeDiffSec = (currentTimestamp - previousBytes.timestamp) / 1000;
        if (timeDiffSec > 0) {
          rxBytesPerSec = Math.max(0, (currentRxBytes - previousBytes.rx) / timeDiffSec);
          txBytesPerSec = Math.max(0, (currentTxBytes - previousBytes.tx) / timeDiffSec);
        }
      }
      
      setPreviousBytes({
        rx: currentRxBytes,
        tx: currentTxBytes,
        timestamp: currentTimestamp,
      });
      
      const perfData: PerformanceData = {
        cpu: metrics.system?.cpu || 0,
        memory: metrics.system?.memory || 0,
        disk: metrics.system?.disk || 0,
        load: [
          metrics.system?.cpu || 0,
          (metrics.system?.cpu || 0) * 0.9,
          (metrics.system?.cpu || 0) * 1.1,
        ],
        sessions: {
          active: metrics.sessions?.active || 0,
          max: metrics.sessions?.total || 262144,
          rate: Math.random() * 1000,
        },
        throughput: {
          rx: rxBytesPerSec,
          tx: txBytesPerSec,
        },
        dataplane: {
          cpu: metrics.system?.cpu || 0,
          packets: Math.random() * 1000000,
        },
        managementPlane: {
          cpu: (metrics.system?.cpu || 0) * 0.5,
          memory: metrics.system?.memory || 0,
        },
      };
      
      setData(perfData);
      
      // Ajouter à l'historique
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
      
      setHistory(prev => {
        const newHistory = [...prev, {
          time: timeStr,
          cpu: perfData.cpu,
          memory: perfData.memory,
          sessions: perfData.sessions.active,
          throughput: (perfData.throughput.rx + perfData.throughput.tx) / 1024 / 1024,
        }];
        return newHistory.slice(-30);
      });
      
    } catch (error) {
      console.error("Erreur chargement performance:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    loadData();
  };

  const formatBytes = (bytes: number) => {
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + " GB/s";
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(2) + " MB/s";
    if (bytes >= 1e3) return (bytes / 1e3).toFixed(2) + " KB/s";
    return bytes.toFixed(0) + " B/s";
  };

  const cpuPieData = [
    { name: "Utilisé", value: data?.cpu || 0 },
    { name: "Disponible", value: 100 - (data?.cpu || 0) },
  ];

  const memoryPieData = [
    { name: "Utilisé", value: data?.memory || 0 },
    { name: "Disponible", value: 100 - (data?.memory || 0) },
  ];

  return (
    <DashboardLayout onRefresh={handleRefresh} loading={loading}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Performance</h1>
          <p className="text-muted-foreground">
            Monitoring en temps réel des ressources système
          </p>
        </div>

        {/* Cartes principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CPU */}
          <div className="glass rounded-lg p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-paloalto-blue" />
                <span className="text-sm text-muted-foreground">CPU Total</span>
              </div>
              {(data?.cpu || 0) > 80 ? (
                <TrendingUp className="w-4 h-4 text-red-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-green-500" />
              )}
            </div>
            <div className="text-4xl font-bold mb-2">{data?.cpu || 0}%</div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${(data?.cpu || 0) > 80 ? 'bg-red-500' : (data?.cpu || 0) > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${data?.cpu || 0}%` }}
              />
            </div>
          </div>

          {/* Memory */}
          <div className="glass rounded-lg p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MemoryStick className="w-5 h-5 text-paloalto-orange" />
                <span className="text-sm text-muted-foreground">Mémoire</span>
              </div>
            </div>
            <div className="text-4xl font-bold mb-2">{data?.memory || 0}%</div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${(data?.memory || 0) > 80 ? 'bg-red-500' : (data?.memory || 0) > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${data?.memory || 0}%` }}
              />
            </div>
          </div>

          {/* Sessions */}
          <div className="glass rounded-lg p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-500" />
                <span className="text-sm text-muted-foreground">Sessions</span>
              </div>
            </div>
            <div className="text-4xl font-bold mb-2">
              {((data?.sessions.active || 0) / 1000).toFixed(1)}K
            </div>
            <div className="text-sm text-muted-foreground">
              / {((data?.sessions.max || 0) / 1000).toFixed(0)}K max
            </div>
          </div>

          {/* Throughput */}
          <div className="glass rounded-lg p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-500" />
                <span className="text-sm text-muted-foreground">Throughput</span>
              </div>
            </div>
            <div className="text-2xl font-bold mb-1">
              ↓ {formatBytes(data?.throughput.rx || 0)}
            </div>
            <div className="text-2xl font-bold text-muted-foreground">
              ↑ {formatBytes(data?.throughput.tx || 0)}
            </div>
          </div>
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Historique CPU/Memory */}
          <div className="glass rounded-lg p-6 border border-white/10">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-paloalto-blue" />
              Historique CPU & Mémoire
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="time" stroke="#888" fontSize={12} />
                  <YAxis stroke="#888" fontSize={12} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a2e",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cpu"
                    name="CPU %"
                    stroke="#0072B8"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="memory"
                    name="Memory %"
                    stroke="#FF6B35"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sessions */}
          <div className="glass rounded-lg p-6 border border-white/10">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-500" />
              Sessions Actives
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
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
                    dataKey="sessions"
                    name="Sessions"
                    stroke="#10b981"
                    fill="url(#sessionGradient)"
                    strokeWidth={2}
                  />
                  <defs>
                    <linearGradient id="sessionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Gauges CPU/Memory */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CPU Gauge */}
          <div className="glass rounded-lg p-6 border border-white/10">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Gauge className="w-5 h-5 text-paloalto-blue" />
              Distribution CPU
            </h3>
            <div className="flex items-center justify-around">
              <div className="h-48 w-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={cpuPieData}
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {cpuPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? "#0072B8" : "#333"} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Dataplane CPU</p>
                  <p className="text-2xl font-bold">{data?.dataplane.cpu || 0}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Management Plane</p>
                  <p className="text-2xl font-bold">{data?.managementPlane.cpu?.toFixed(1) || 0}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Memory Gauge */}
          <div className="glass rounded-lg p-6 border border-white/10">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-paloalto-orange" />
              Utilisation Disque & Mémoire
            </h3>
            <div className="flex items-center justify-around">
              <div className="h-48 w-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={memoryPieData}
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {memoryPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? "#FF6B35" : "#333"} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Mémoire</p>
                  <p className="text-2xl font-bold">{data?.memory || 0}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Disque</p>
                  <p className="text-2xl font-bold">{data?.disk || 0}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Throughput détaillé */}
        <div className="glass rounded-lg p-6 border border-white/10">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-500" />
            Historique Throughput (MB/s)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={history}>
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
                <Bar dataKey="throughput" name="Throughput (MB/s)" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
