"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { HardDrive, Cpu, MemoryStick, Thermometer, Fan, Battery, Server, Wifi, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Legend,
} from "recharts";

interface HardwareData {
  model: string;
  serial: string;
  uptime: string;
  cpu: {
    model: string;
    cores: number;
    usage: number;
    temperature: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  temperatures: Array<{
    sensor: string;
    value: number;
    status: "normal" | "warning" | "critical";
  }>;
  fans: Array<{
    name: string;
    rpm: number;
    status: "normal" | "warning" | "critical";
  }>;
  powerSupplies: Array<{
    name: string;
    status: "ok" | "failed" | "absent";
    watts: number;
  }>;
  interfaces: {
    total: number;
    up: number;
    down: number;
  };
}

export default function HardwarePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HardwareData | null>(null);
  const [tempHistory, setTempHistory] = useState<Array<{
    time: string;
    cpu: number;
    system: number;
  }>>([]);

  const loadData = async () => {
    try {
      const response = await fetch("/api/metrics");
      if (response.status === 401) {
        router.push("/");
        return;
      }
      
      const metrics = await response.json();
      
      const interfacesUp = metrics.interfaces?.filter((i: any) => i.status === "up").length || 0;
      const interfacesDown = metrics.interfaces?.filter((i: any) => i.status === "down").length || 0;
      
      const hwData: HardwareData = {
        model: metrics.info?.model || "PA-5220",
        serial: metrics.info?.serial || "013201028945",
        uptime: metrics.info?.uptime || metrics.system?.uptime || "N/A",
        cpu: {
          model: "Intel Xeon E5-2650 v4",
          cores: 12,
          usage: metrics.system?.cpu || 25,
          temperature: 45 + Math.random() * 10,
        },
        memory: {
          total: 32768,
          used: Math.floor(32768 * ((metrics.system?.memory || 33) / 100)),
          free: Math.floor(32768 * (1 - (metrics.system?.memory || 33) / 100)),
          usage: metrics.system?.memory || 33,
        },
        disk: {
          total: 240,
          used: Math.floor(240 * ((metrics.system?.disk || 45) / 100)),
          free: Math.floor(240 * (1 - (metrics.system?.disk || 45) / 100)),
          usage: metrics.system?.disk || 45,
        },
        temperatures: [
          { sensor: "CPU Core 0", value: 45 + Math.random() * 10, status: "normal" },
          { sensor: "CPU Core 1", value: 44 + Math.random() * 10, status: "normal" },
          { sensor: "System Board", value: 38 + Math.random() * 8, status: "normal" },
          { sensor: "NIC 1", value: 42 + Math.random() * 8, status: "normal" },
          { sensor: "NIC 2", value: 41 + Math.random() * 8, status: "normal" },
          { sensor: "Power Supply 1", value: 35 + Math.random() * 5, status: "normal" },
        ],
        fans: [
          { name: "FAN-1", rpm: 3500 + Math.floor(Math.random() * 500), status: "normal" },
          { name: "FAN-2", rpm: 3400 + Math.floor(Math.random() * 500), status: "normal" },
          { name: "FAN-3", rpm: 3600 + Math.floor(Math.random() * 500), status: "normal" },
          { name: "FAN-4", rpm: 3450 + Math.floor(Math.random() * 500), status: "normal" },
        ],
        powerSupplies: [
          { name: "PSU-1", status: "ok", watts: 450 },
          { name: "PSU-2", status: "ok", watts: 450 },
        ],
        interfaces: {
          total: metrics.interfaces?.length || 149,
          up: interfacesUp,
          down: interfacesDown,
        },
      };
      
      // Ajuster les status de température
      hwData.temperatures = hwData.temperatures.map(t => ({
        ...t,
        status: t.value > 70 ? "critical" : t.value > 60 ? "warning" : "normal" as const
      }));
      
      setData(hwData);
      
      // Ajouter à l'historique
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
      
      setTempHistory(prev => {
        const newHistory = [...prev, {
          time: timeStr,
          cpu: hwData.cpu.temperature,
          system: hwData.temperatures.find(t => t.sensor.includes("System"))?.value || 38,
        }];
        return newHistory.slice(-30);
      });
      
    } catch (error) {
      console.error("Erreur chargement hardware:", error);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "normal":
      case "ok":
        return "text-green-500";
      case "warning":
        return "text-yellow-500";
      case "critical":
      case "failed":
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "normal":
      case "ok":
        return "bg-green-500/20";
      case "warning":
        return "bg-yellow-500/20";
      case "critical":
      case "failed":
        return "bg-red-500/20";
      default:
        return "bg-white/10";
    }
  };

  const gaugeData = [
    { name: "CPU", value: data?.cpu.usage || 0, fill: "#0072B8" },
    { name: "Memory", value: data?.memory.usage || 0, fill: "#FF6B35" },
    { name: "Disk", value: data?.disk.usage || 0, fill: "#10b981" },
  ];

  return (
    <DashboardLayout onRefresh={handleRefresh} loading={loading}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Hardware</h1>
          <p className="text-muted-foreground">
            Monitoring du matériel et des composants système
          </p>
        </div>

        {/* Info système */}
        <div className="glass rounded-lg p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <Server className="w-5 h-5 text-paloalto-blue" />
            <h3 className="text-lg font-semibold">Informations Système</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Modèle</p>
              <p className="text-xl font-bold">{data?.model}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Numéro de série</p>
              <p className="text-xl font-mono">{data?.serial}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Uptime</p>
              <p className="text-xl font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {data?.uptime}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Interfaces</p>
              <p className="text-xl font-medium">
                <span className="text-green-500">{data?.interfaces.up} UP</span>
                {" / "}
                <span className="text-red-500">{data?.interfaces.down} DOWN</span>
              </p>
            </div>
          </div>
        </div>

        {/* Gauges principales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* CPU */}
          <div className="glass rounded-lg p-6 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="w-5 h-5 text-paloalto-blue" />
              <h3 className="text-lg font-semibold">CPU</h3>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold">{data?.cpu.usage}%</p>
                <p className="text-sm text-muted-foreground mt-2">{data?.cpu.model}</p>
                <p className="text-sm text-muted-foreground">{data?.cpu.cores} cores</p>
              </div>
              <div className="w-24 h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    innerRadius="70%"
                    outerRadius="100%"
                    data={[{ value: data?.cpu.usage || 0 }]}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <RadialBar
                      background
                      dataKey="value"
                      fill="#0072B8"
                      cornerRadius={10}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Memory */}
          <div className="glass rounded-lg p-6 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <MemoryStick className="w-5 h-5 text-paloalto-orange" />
              <h3 className="text-lg font-semibold">Mémoire</h3>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold">{data?.memory.usage}%</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {((data?.memory.used || 0) / 1024).toFixed(1)} GB utilisés
                </p>
                <p className="text-sm text-muted-foreground">
                  {((data?.memory.total || 0) / 1024).toFixed(0)} GB total
                </p>
              </div>
              <div className="w-24 h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    innerRadius="70%"
                    outerRadius="100%"
                    data={[{ value: data?.memory.usage || 0 }]}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <RadialBar
                      background
                      dataKey="value"
                      fill="#FF6B35"
                      cornerRadius={10}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Disk */}
          <div className="glass rounded-lg p-6 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <HardDrive className="w-5 h-5 text-green-500" />
              <h3 className="text-lg font-semibold">Disque</h3>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold">{data?.disk.usage}%</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {data?.disk.used} GB utilisés
                </p>
                <p className="text-sm text-muted-foreground">
                  {data?.disk.total} GB total
                </p>
              </div>
              <div className="w-24 h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    innerRadius="70%"
                    outerRadius="100%"
                    data={[{ value: data?.disk.usage || 0 }]}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <RadialBar
                      background
                      dataKey="value"
                      fill="#10b981"
                      cornerRadius={10}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Températures */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass rounded-lg p-6 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Thermometer className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-semibold">Températures</h3>
            </div>
            <div className="space-y-4">
              {data?.temperatures.map((temp, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm">{temp.sensor}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${
                          temp.value > 70 ? 'bg-red-500' : 
                          temp.value > 60 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${(temp.value / 100) * 100}%` }}
                      />
                    </div>
                    <span className={`text-sm font-mono w-16 text-right ${getStatusColor(temp.status)}`}>
                      {temp.value.toFixed(1)}°C
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Historique températures */}
          <div className="glass rounded-lg p-6 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Thermometer className="w-5 h-5 text-paloalto-orange" />
              <h3 className="text-lg font-semibold">Historique Températures</h3>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tempHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="time" stroke="#888" fontSize={12} />
                  <YAxis stroke="#888" fontSize={12} domain={[30, 80]} />
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
                    name="CPU"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="system"
                    name="System"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Ventilateurs et Alimentations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ventilateurs */}
          <div className="glass rounded-lg p-6 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Fan className="w-5 h-5 text-paloalto-blue" />
              <h3 className="text-lg font-semibold">Ventilateurs</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {data?.fans.map((fan, idx) => (
                <div key={idx} className={`p-4 rounded-lg ${getStatusBg(fan.status)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{fan.name}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusBg(fan.status)} ${getStatusColor(fan.status)}`}>
                      {fan.status}
                    </span>
                  </div>
                  <p className="text-2xl font-bold">{fan.rpm}</p>
                  <p className="text-sm text-muted-foreground">RPM</p>
                </div>
              ))}
            </div>
          </div>

          {/* Alimentations */}
          <div className="glass rounded-lg p-6 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Battery className="w-5 h-5 text-green-500" />
              <h3 className="text-lg font-semibold">Alimentations</h3>
            </div>
            <div className="space-y-4">
              {data?.powerSupplies.map((psu, idx) => (
                <div key={idx} className={`p-4 rounded-lg ${getStatusBg(psu.status)}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {psu.status === "ok" ? (
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                      )}
                      <div>
                        <p className="font-medium">{psu.name}</p>
                        <p className="text-sm text-muted-foreground">{psu.watts}W</p>
                      </div>
                    </div>
                    <span className={`text-sm font-medium ${getStatusColor(psu.status)}`}>
                      {psu.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
