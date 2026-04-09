"use client";

import { DiagnosticIssue } from "@/types";
import { AlertTriangle, AlertCircle, Info, Copy, Check, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";

interface DiagnosticPanelProps {
  issues: DiagnosticIssue[];
  healthScore: number;
}

export default function DiagnosticPanel({ issues, healthScore }: DiagnosticPanelProps) {
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  const copyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
    setCopiedCommand(command);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="w-6 h-6 text-red-500" />;
      case "major":
        return <AlertTriangle className="w-6 h-6 text-orange-500" />;
      case "warning":
        return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      default:
        return <Info className="w-6 h-6 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "border-l-4 border-red-500 bg-red-500/5";
      case "major":
        return "border-l-4 border-orange-500 bg-orange-500/5";
      case "warning":
        return "border-l-4 border-yellow-500 bg-yellow-500/5";
      default:
        return "border-l-4 border-blue-500 bg-blue-500/5";
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      system: "Système",
      network: "Réseau",
      security: "Sécurité",
      performance: "Performance",
      ha: "High Availability",
      license: "Licenses",
    };
    return labels[category] || category;
  };

  const getHealthColor = () => {
    if (healthScore >= 90) return "text-green-500";
    if (healthScore >= 70) return "text-yellow-500";
    if (healthScore >= 50) return "text-orange-500";
    return "text-red-500";
  };

  const getHealthIcon = () => {
    if (healthScore >= 70) return <TrendingUp className="w-8 h-8" />;
    return <TrendingDown className="w-8 h-8" />;
  };

  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const majorCount = issues.filter((i) => i.severity === "major").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  return (
    <div className="space-y-6">
      {/* Health Score */}
      <div className="glass rounded-lg p-6 border border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2">Score de Santé Global</h3>
            <p className="text-sm text-muted-foreground">
              Basé sur l'analyse de {issues.length} problème{issues.length > 1 ? "s" : ""} détecté{issues.length > 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${getHealthColor()}`}>
              {getHealthIcon()}
              <span className="text-5xl font-bold">{healthScore}</span>
              <span className="text-2xl">/100</span>
            </div>
          </div>
        </div>

        {/* Résumé par sévérité */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          {criticalCount > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-500">{criticalCount}</p>
                <p className="text-xs text-red-400">Critique{criticalCount > 1 ? "s" : ""}</p>
              </div>
            </div>
          )}
          {majorCount > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold text-orange-500">{majorCount}</p>
                <p className="text-xs text-orange-400">Majeur{majorCount > 1 ? "s" : ""}</p>
              </div>
            </div>
          )}
          {warningCount > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold text-yellow-500">{warningCount}</p>
                <p className="text-xs text-yellow-400">Warning{warningCount > 1 ? "s" : ""}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Liste des problèmes */}
      {issues.length > 0 && (
        <div className="glass rounded-lg p-6 border border-white/10">
          <h3 className="text-lg font-semibold mb-4">Problèmes Détectés</h3>
          <div className="space-y-4">
            {issues.map((issue, index) => (
              <div
                key={issue.id}
                className={`rounded-lg p-5 ${getSeverityColor(issue.severity)}`}
              >
                <div className="flex items-start gap-4">
                  {getSeverityIcon(issue.severity)}
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium px-2 py-1 rounded bg-white/10">
                            {getCategoryLabel(issue.category)}
                          </span>
                          <span className="text-xs font-medium px-2 py-1 rounded bg-white/10 uppercase">
                            {issue.severity}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {issue.source === "live" ? "🔴 Live" : "📦 TSF"}
                          </span>
                        </div>
                        <h4 className="text-lg font-semibold">{issue.title}</h4>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm mb-3">{issue.description}</p>

                    {/* Impact */}
                    <div className="mb-3 p-3 rounded bg-black/20">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Impact :
                      </p>
                      <p className="text-sm">{issue.impact}</p>
                    </div>

                    {/* Recommandation */}
                    <div className="mb-3 p-3 rounded bg-paloalto-blue/10 border border-paloalto-blue/20">
                      <p className="text-xs font-medium text-paloalto-blue mb-2">
                        Recommandation :
                      </p>
                      <p className="text-sm whitespace-pre-line">{issue.recommendation}</p>
                    </div>

                    {/* Commandes CLI */}
                    {issue.cliCommands && issue.cliCommands.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Commandes de diagnostic :
                        </p>
                        <div className="space-y-2">
                          {issue.cliCommands.map((cmd, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <code className="flex-1 px-3 py-2 bg-black/30 rounded text-xs font-mono">
                                {cmd}
                              </code>
                              <button
                                onClick={() => copyCommand(cmd)}
                                className="p-2 hover:bg-white/10 rounded transition-colors"
                                title="Copier la commande"
                              >
                                {copiedCommand === cmd ? (
                                  <Check className="w-4 h-4 text-green-500" />
                                ) : (
                                  <Copy className="w-4 h-4 text-muted-foreground" />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Composants affectés */}
                    {issue.affectedComponents && issue.affectedComponents.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Composants affectés :
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {issue.affectedComponents.map((comp, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-1 rounded bg-white/10 font-mono"
                            >
                              {comp}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
