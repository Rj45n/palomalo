"use client";

import Link from "next/link";
import { Network, ArrowUp, ArrowDown, AlertTriangle, AlertCircle, Activity, ChevronRight } from "lucide-react";
import { InterfaceStats } from "@/types";

interface InterfacesTableEnhancedProps {
  interfaces: InterfaceStats[];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

export default function InterfacesTableEnhanced({ interfaces }: InterfacesTableEnhancedProps) {
  // Calculer les statistiques globales
  const totalInterfaces = interfaces.length;
  const upInterfaces = interfaces.filter((i) => i.status === "up").length;
  const downInterfaces = interfaces.filter((i) => i.status === "down").length;
  const interfacesWithErrors = interfaces.filter(
    (i) => i.rxErrors > 0 || i.txErrors > 0
  ).length;
  const interfacesWithDrops = interfaces.filter(
    (i) => i.rxDrops > 0 || i.txDrops > 0
  ).length;

  // Fonction pour déterminer la couleur de l'alerte
  const getAlertColor = (iface: InterfaceStats) => {
    if (iface.status === "down") return "border-l-4 border-red-500 bg-red-500/5";
    if (iface.rxErrors > 100 || iface.txErrors > 100)
      return "border-l-4 border-red-500 bg-red-500/5";
    if (iface.rxErrors > 0 || iface.txErrors > 0)
      return "border-l-4 border-orange-500 bg-orange-500/5";
    if (iface.rxDrops > 1000 || iface.txDrops > 1000)
      return "border-l-4 border-orange-500 bg-orange-500/5";
    if ((iface.utilization || 0) > 85)
      return "border-l-4 border-yellow-500 bg-yellow-500/5";
    return "";
  };

  return (
    <div className="glass rounded-lg p-6 border border-white/10">
      {/* Header avec statistiques */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-paloalto-blue" />
          <h3 className="text-lg font-semibold">Network Interfaces</h3>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-muted-foreground">
              {upInterfaces} UP
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-muted-foreground">
              {downInterfaces} DOWN
            </span>
          </div>
          {interfacesWithErrors > 0 && (
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              <span className="text-orange-500">
                {interfacesWithErrors} avec erreurs
              </span>
            </div>
          )}
          {interfacesWithDrops > 0 && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <span className="text-yellow-500">
                {interfacesWithDrops} avec drops
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
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
                Speed/Duplex
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                RX
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                TX
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                Packets
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                Errors
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                Drops
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                Util %
              </th>
            </tr>
          </thead>
          <tbody>
            {interfaces.map((iface, index) => (
              <tr
                key={index}
                className={`border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${getAlertColor(iface)}`}
              >
                {/* Interface Name — cliquable vers le détail */}
                <td className="py-3 px-4 font-medium">
                  <Link
                    href={`/dashboard/interfaces/${encodeURIComponent(iface.name)}`}
                    className="flex items-center gap-1 hover:text-blue-400 transition-colors group"
                  >
                    {iface.name}
                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </td>

                {/* Status */}
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      iface.status === "up"
                        ? "bg-green-500/20 text-green-500"
                        : iface.status === "down"
                        ? "bg-red-500/20 text-red-500"
                        : "bg-gray-500/20 text-gray-500"
                    }`}
                  >
                    {iface.status}
                  </span>
                </td>

                {/* Speed/Duplex */}
                <td className="py-3 px-4 text-muted-foreground text-sm">
                  {iface.speed}
                  {iface.duplex && <span className="text-xs ml-1">({iface.duplex})</span>}
                </td>

                {/* RX Bytes */}
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <ArrowDown className="w-3 h-3 text-green-500" />
                    <span className="text-sm">{formatBytes(iface.rx)}</span>
                  </div>
                </td>

                {/* TX Bytes */}
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <ArrowUp className="w-3 h-3 text-paloalto-orange" />
                    <span className="text-sm">{formatBytes(iface.tx)}</span>
                  </div>
                </td>

                {/* Packets */}
                <td className="py-3 px-4 text-right">
                  <div className="flex flex-col items-end text-xs">
                    <span className="text-green-500">
                      ↓ {formatNumber(iface.rxPackets)}
                    </span>
                    <span className="text-orange-400">
                      ↑ {formatNumber(iface.txPackets)}
                    </span>
                  </div>
                </td>

                {/* Errors */}
                <td className="py-3 px-4 text-right">
                  <div className="flex flex-col items-end text-xs">
                    {iface.rxErrors > 0 || iface.txErrors > 0 ? (
                      <>
                        <span
                          className={
                            iface.rxErrors > 100 ? "text-red-500 font-medium" : "text-orange-400"
                          }
                        >
                          ↓ {iface.rxErrors.toLocaleString()}
                        </span>
                        <span
                          className={
                            iface.txErrors > 100 ? "text-red-500 font-medium" : "text-orange-400"
                          }
                        >
                          ↑ {iface.txErrors.toLocaleString()}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </div>
                </td>

                {/* Drops */}
                <td className="py-3 px-4 text-right">
                  <div className="flex flex-col items-end text-xs">
                    {iface.rxDrops > 0 || iface.txDrops > 0 ? (
                      <>
                        <span
                          className={
                            iface.rxDrops > 1000 ? "text-red-500 font-medium" : "text-yellow-400"
                          }
                        >
                          ↓ {iface.rxDrops.toLocaleString()}
                        </span>
                        <span
                          className={
                            iface.txDrops > 1000 ? "text-red-500 font-medium" : "text-yellow-400"
                          }
                        >
                          ↑ {iface.txDrops.toLocaleString()}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </div>
                </td>

                {/* Utilization */}
                <td className="py-3 px-4 text-right">
                  {iface.utilization !== undefined ? (
                    <div className="flex items-center justify-end gap-2">
                      <span
                        className={`text-sm font-medium ${
                          iface.utilization > 95
                            ? "text-red-500"
                            : iface.utilization > 85
                            ? "text-orange-500"
                            : iface.utilization > 70
                            ? "text-yellow-500"
                            : "text-green-500"
                        }`}
                      >
                        {iface.utilization}%
                      </span>
                      {iface.utilization > 85 && (
                        <Activity className="w-3 h-3 text-orange-500" />
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">N/A</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer avec légende */}
      <div className="mt-4 pt-4 border-t border-white/10 text-xs text-muted-foreground">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-l-4 border-red-500" />
            <span>Interface DOWN ou erreurs critiques (&gt;100)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-l-4 border-orange-500" />
            <span>Erreurs détectées ou drops élevés (&gt;1000)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-l-4 border-yellow-500" />
            <span>Utilisation élevée (&gt;85%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
