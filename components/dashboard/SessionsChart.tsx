"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface SessionsChartProps {
  data: {
    total: number;
    active: number;
    tcp: number;
    udp: number;
    icmp: number;
  };
}

export default function SessionsChart({ data }: SessionsChartProps) {
  const chartData = [
    { name: "Total", value: data.total, fill: "#0072B8" },
    { name: "Active", value: data.active, fill: "#FF6B35" },
    { name: "TCP", value: data.tcp, fill: "#10b981" },
    { name: "UDP", value: data.udp, fill: "#8b5cf6" },
    { name: "ICMP", value: data.icmp, fill: "#f59e0b" },
  ];

  return (
    <div className="glass rounded-lg p-6 border border-white/10">
      <h3 className="text-lg font-semibold mb-4">Sessions Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="name"
            stroke="rgba(255,255,255,0.5)"
            style={{ fontSize: "12px" }}
          />
          <YAxis
            stroke="rgba(255,255,255,0.5)"
            style={{ fontSize: "12px" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(10, 10, 15, 0.9)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              color: "#fff",
            }}
          />
          <Bar dataKey="value" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
