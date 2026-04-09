"use client";

import { useState, useEffect } from "react";
import { DiagnosticIssue, AdvancedMetrics, TSFAnalysisDeep } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  RefreshCw, 
  Download,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";

interface DiagnosticCenterProps {
  issues: DiagnosticIssue[];
  healthScore: number;
  onRefresh?: () => void;
  onExport?: () => void;
  stats?: {
    critical: number;
    major: number;
    warning: number;
    info: number;
  };
}

export function DiagnosticCenter({
  issues,
  healthScore,
  onRefresh,
  onExport,
  stats,
}: DiagnosticCenterProps) {
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());

  const toggleIssue = (id: string) => {
    const newExpanded = new Set(expandedIssues);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIssues(newExpanded);
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getHealthLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Bon";
    if (score >= 40) return "Attention";
    return "Critique";
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "major":
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case "increasing":
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case "decreasing":
        return <TrendingDown className="w-4 h-4 text-green-500" />;
      case "stable":
        return <Minus className="w-4 h-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const criticalIssues = issues.filter((i) => i.severity === "critical");
  const majorIssues = issues.filter((i) => i.severity === "major");
  const warningIssues = issues.filter((i) => i.severity === "warning");
  const infoIssues = issues.filter((i) => i.severity === "info");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Diagnostic Center</h1>
        <div className="flex gap-2">
          {onRefresh && (
            <Button onClick={onRefresh} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Live
            </Button>
          )}
          {onExport && (
            <Button onClick={onExport} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Health Score */}
      <Card className="bg-white/5 backdrop-blur-sm border-white/10 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-2">Health Score</h2>
            <div className="flex items-baseline gap-2">
              <span className={`text-5xl font-bold ${getHealthColor(healthScore)}`}>
                {healthScore}
              </span>
              <span className="text-2xl text-gray-400">/100</span>
              <span className={`ml-4 text-lg ${getHealthColor(healthScore)}`}>
                {getHealthLabel(healthScore)}
              </span>
            </div>
          </div>
          <div className="w-48 h-48">
            <svg viewBox="0 0 100 100" className="transform -rotate-90">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={
                  healthScore >= 80
                    ? "#10b981"
                    : healthScore >= 60
                    ? "#eab308"
                    : healthScore >= 40
                    ? "#f97316"
                    : "#ef4444"
                }
                strokeWidth="8"
                strokeDasharray={`${(healthScore / 100) * 251.2} 251.2`}
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
            <div>
              <div className="text-sm text-gray-400">Critical</div>
              <div className="text-2xl font-bold text-red-500">{stats.critical}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Major</div>
              <div className="text-2xl font-bold text-orange-500">{stats.major}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Warning</div>
              <div className="text-2xl font-bold text-yellow-500">{stats.warning}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Info</div>
              <div className="text-2xl font-bold text-blue-500">{stats.info}</div>
            </div>
          </div>
        )}
      </Card>

      {/* Issues List */}
      <div className="space-y-4">
        {/* Critical */}
        {criticalIssues.length > 0 && (
          <div>
            <h3 className="text-xl font-semibold mb-3 text-red-500">
              CRITICAL ({criticalIssues.length})
            </h3>
            {criticalIssues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                expanded={expandedIssues.has(issue.id)}
                onToggle={() => toggleIssue(issue.id)}
              />
            ))}
          </div>
        )}

        {/* Major */}
        {majorIssues.length > 0 && (
          <div>
            <h3 className="text-xl font-semibold mb-3 text-orange-500">
              MAJOR ({majorIssues.length})
            </h3>
            {majorIssues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                expanded={expandedIssues.has(issue.id)}
                onToggle={() => toggleIssue(issue.id)}
              />
            ))}
          </div>
        )}

        {/* Warning */}
        {warningIssues.length > 0 && (
          <div>
            <h3 className="text-xl font-semibold mb-3 text-yellow-500">
              WARNING ({warningIssues.length})
            </h3>
            {warningIssues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                expanded={expandedIssues.has(issue.id)}
                onToggle={() => toggleIssue(issue.id)}
              />
            ))}
          </div>
        )}

        {/* Info */}
        {infoIssues.length > 0 && (
          <div>
            <h3 className="text-xl font-semibold mb-3 text-blue-500">
              INFO ({infoIssues.length})
            </h3>
            {infoIssues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                expanded={expandedIssues.has(issue.id)}
                onToggle={() => toggleIssue(issue.id)}
              />
            ))}
          </div>
        )}

        {issues.length === 0 && (
          <Card className="bg-white/5 backdrop-blur-sm border-white/10 p-8 text-center">
            <div className="text-green-500 text-lg font-semibold">
              Aucun problème détecté
            </div>
            <div className="text-gray-400 mt-2">
              Le firewall fonctionne correctement
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

interface IssueCardProps {
  issue: DiagnosticIssue & { trend?: string; tsfContext?: string };
  expanded: boolean;
  onToggle: () => void;
}

function IssueCard({ issue, expanded, onToggle }: IssueCardProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "border-red-500/50 bg-red-500/5";
      case "major":
        return "border-orange-500/50 bg-orange-500/5";
      case "warning":
        return "border-yellow-500/50 bg-yellow-500/5";
      default:
        return "border-blue-500/50 bg-blue-500/5";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "major":
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case "increasing":
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case "decreasing":
        return <TrendingDown className="w-4 h-4 text-green-500" />;
      case "stable":
        return <Minus className="w-4 h-4 text-gray-500" />;
      default:
        return null;
    }
  };

  return (
    <Card
      className={`mb-3 border ${getSeverityColor(issue.severity)} backdrop-blur-sm cursor-pointer transition-all hover:scale-[1.01]`}
      onClick={onToggle}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {getSeverityIcon(issue.severity)}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{issue.title}</h4>
                {issue.trend && getTrendIcon(issue.trend)}
                {issue.source && (
                  <span className="text-xs px-2 py-0.5 rounded bg-white/10">
                    {issue.source}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400 mt-1">{issue.description}</p>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            {new Date(issue.detectedAt).toLocaleTimeString()}
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
            <div>
              <div className="text-sm font-semibold text-gray-300 mb-1">Impact:</div>
              <div className="text-sm text-gray-400">{issue.impact}</div>
            </div>

            <div>
              <div className="text-sm font-semibold text-gray-300 mb-1">
                Recommandation:
              </div>
              <div className="text-sm text-gray-400 whitespace-pre-line">
                {issue.recommendation}
              </div>
            </div>

            {issue.cliCommands && issue.cliCommands.length > 0 && (
              <div>
                <div className="text-sm font-semibold text-gray-300 mb-1">
                  Commandes CLI:
                </div>
                <div className="space-y-1">
                  {issue.cliCommands.map((cmd, i) => (
                    <code
                      key={i}
                      className="block text-xs bg-black/30 px-2 py-1 rounded font-mono"
                    >
                      {cmd}
                    </code>
                  ))}
                </div>
              </div>
            )}

            {issue.affectedComponents && issue.affectedComponents.length > 0 && (
              <div>
                <div className="text-sm font-semibold text-gray-300 mb-1">
                  Composants affectés:
                </div>
                <div className="flex flex-wrap gap-2">
                  {issue.affectedComponents.map((comp, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-1 rounded bg-white/10"
                    >
                      {comp}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {issue.tsfContext && (
              <div>
                <div className="text-sm font-semibold text-gray-300 mb-1">
                  Contexte TSF:
                </div>
                <div className="text-sm text-gray-400 italic">{issue.tsfContext}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
