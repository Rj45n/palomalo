"use client";

import { AlertTriangle, AlertCircle, Info, Copy, Check } from "lucide-react";
import { InterfaceIssue } from "@/types";
import { useState } from "react";

interface InterfaceIssuesPanelProps {
  issues: InterfaceIssue[];
}

export default function InterfaceIssuesPanel({ issues }: InterfaceIssuesPanelProps) {
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  if (issues.length === 0) {
    return (
      <div className="glass rounded-lg p-6 border border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-5 h-5 text-green-500" />
          <h3 className="text-lg font-semibold">Diagnostic Interfaces</h3>
        </div>
        <div className="flex items-center gap-3 text-green-500">
          <Check className="w-6 h-6" />
          <p>Aucun problème détecté sur les interfaces</p>
        </div>
      </div>
    );
  }

  const criticalIssues = issues.filter((i) => i.severity === "critical");
  const warningIssues = issues.filter((i) => i.severity === "warning");
  const infoIssues = issues.filter((i) => i.severity === "info");

  const copyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
    setCopiedCommand(command);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "border-l-4 border-red-500 bg-red-500/5";
      case "warning":
        return "border-l-4 border-orange-500 bg-orange-500/5";
      default:
        return "border-l-4 border-blue-500 bg-blue-500/5";
    }
  };

  return (
    <div className="glass rounded-lg p-6 border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-paloalto-orange" />
          <h3 className="text-lg font-semibold">Diagnostic Interfaces</h3>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {criticalIssues.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-red-500 font-medium">
                {criticalIssues.length} critique{criticalIssues.length > 1 ? "s" : ""}
              </span>
            </div>
          )}
          {warningIssues.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-orange-500 font-medium">
                {warningIssues.length} warning{warningIssues.length > 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Liste des problèmes */}
      <div className="space-y-4">
        {issues.map((issue, index) => (
          <div
            key={index}
            className={`rounded-lg p-4 ${getSeverityColor(issue.severity)}`}
          >
            <div className="flex items-start gap-3">
              {getSeverityIcon(issue.severity)}
              <div className="flex-1">
                {/* Interface + Message */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium">{issue.interface}</span>
                  <span className="text-muted-foreground">•</span>
                  <span>{issue.message}</span>
                </div>

                {/* Recommandation */}
                <div className="text-sm text-muted-foreground mb-3">
                  <span className="font-medium">Recommandation :</span>{" "}
                  {issue.recommendation}
                </div>

                {/* Commande CLI */}
                {issue.cliCommand && (
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-black/30 rounded text-sm font-mono">
                      {issue.cliCommand}
                    </code>
                    <button
                      onClick={() => copyCommand(issue.cliCommand!)}
                      className="p-2 hover:bg-white/10 rounded transition-colors"
                      title="Copier la commande"
                    >
                      {copiedCommand === issue.cliCommand ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer avec statistiques */}
      <div className="mt-6 pt-4 border-t border-white/10 text-sm text-muted-foreground">
        <p>
          {issues.length} problème{issues.length > 1 ? "s" : ""} détecté{issues.length > 1 ? "s" : ""} •{" "}
          Dernière analyse : {new Date().toLocaleTimeString("fr-FR")}
        </p>
      </div>
    </div>
  );
}
