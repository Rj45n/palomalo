"use client";

import { Network, ArrowUp, ArrowDown } from "lucide-react";

interface InterfacesTableProps {
  interfaces: Array<{
    name: string;
    status: string;
    speed: string;
    rx: number;
    tx: number;
    rxDrops?: number;
    txDrops?: number;
  }>;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}

export default function InterfacesTable({ interfaces }: InterfacesTableProps) {
  return (
    <div className="glass rounded-lg p-6 border border-white/10">
      <div className="flex items-center gap-2 mb-4">
        <Network className="w-5 h-5 text-paloalto-blue" />
        <h3 className="text-lg font-semibold">Network Interfaces</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                Interface
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                Status
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                Speed
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                RX
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                TX
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                Drops
              </th>
            </tr>
          </thead>
          <tbody>
            {interfaces.map((iface, index) => (
              <tr
                key={index}
                className="border-b border-white/5 hover:bg-white/5 transition-colors"
              >
                <td className="py-3 px-4 font-medium">{iface.name}</td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      iface.status === "up"
                        ? "bg-green-500/20 text-green-500"
                        : "bg-red-500/20 text-red-500"
                    }`}
                  >
                    {iface.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-muted-foreground">{iface.speed}</td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <ArrowDown className="w-3 h-3 text-green-500" />
                    <span>{formatBytes(iface.rx)}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <ArrowUp className="w-3 h-3 text-paloalto-orange" />
                    <span>{formatBytes(iface.tx)}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex flex-col items-end text-xs">
                    {iface.rxDrops !== undefined && (
                      <span className="text-red-400">
                        ↓ {iface.rxDrops.toLocaleString()}
                      </span>
                    )}
                    {iface.txDrops !== undefined && (
                      <span className="text-orange-400">
                        ↑ {iface.txDrops.toLocaleString()}
                      </span>
                    )}
                    {iface.rxDrops === undefined && iface.txDrops === undefined && (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
