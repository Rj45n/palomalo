"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface CPUMemoryChartProps {
  data: Array<{
    time: string;
    cpu: number;
    memory: number;
  }>;
}

export default function CPUMemoryChart({ data }: CPUMemoryChartProps) {
  return (
    <div className="glass rounded-lg p-6 border border-white/10">
      <h3 className="text-lg font-semibold mb-4">CPU & Memory Usage</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="time"
            stroke="rgba(255,255,255,0.5)"
            style={{ fontSize: "12px" }}
          />
          <YAxis
            stroke="rgba(255,255,255,0.5)"
            style={{ fontSize: "12px" }}
            domain={[0, 100]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(10, 10, 15, 0.9)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              color: "#fff",
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="cpu"
            stroke="#0072B8"
            strokeWidth={2}
            dot={false}
            name="CPU %"
          />
          <Line
            type="monotone"
            dataKey="memory"
            stroke="#FF6B35"
            strokeWidth={2}
            dot={false}
            name="Memory %"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
