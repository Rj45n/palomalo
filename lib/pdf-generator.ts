/**
 * Génère un rapport PDF à partir d'un DiagnosticRecord
 * Rendu côté serveur via @react-pdf/renderer
 */
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { DiagnosticRecord } from "@/types";
import React from "react";

const C = {
  blue:   "#0072B8",
  red:    "#ef4444",
  orange: "#f97316",
  yellow: "#eab308",
  green:  "#22c55e",
  gray:   "#6b7280",
  light:  "#f9fafb",
  dark:   "#111827",
};

const styles = StyleSheet.create({
  page:         { padding: 40, fontFamily: "Helvetica", backgroundColor: "#ffffff", fontSize: 10 },
  header:       { flexDirection: "row", justifyContent: "space-between", marginBottom: 24, borderBottomWidth: 2, borderBottomColor: C.blue, paddingBottom: 12 },
  title:        { fontSize: 18, fontFamily: "Helvetica-Bold", color: C.blue },
  subtitle:     { fontSize: 9, color: C.gray, marginTop: 3 },
  scoreNum:     { fontSize: 30, fontFamily: "Helvetica-Bold" },
  scoreLabel:   { fontSize: 8, color: C.gray },
  section:      { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.blue, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: "#e5e7eb", paddingBottom: 3 },
  row:          { flexDirection: "row", gap: 6, marginBottom: 6 },
  metricBox:    { flex: 1, backgroundColor: C.light, borderRadius: 4, padding: 8 },
  metricLabel:  { fontSize: 7, color: C.gray },
  metricValue:  { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 2 },
  issueBox:     { borderRadius: 4, padding: 9, marginBottom: 5 },
  issueHeader:  { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  issueTitle:   { fontSize: 9, fontFamily: "Helvetica-Bold", flex: 1 },
  issueDesc:    { fontSize: 8, color: "#374151", marginTop: 3 },
  issueReco:    { fontSize: 7, color: C.gray, marginTop: 3 },
  badge:        { fontSize: 7, fontFamily: "Helvetica-Bold", paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 },
  footer:       { position: "absolute", bottom: 28, left: 40, right: 40, fontSize: 7, color: C.gray, flexDirection: "row", justifyContent: "space-between" },
});

function scoreColor(s: number) { return s >= 80 ? C.green : s >= 50 ? C.yellow : C.red; }
function sevColor(s: string)   { return s === "critical" ? C.red : s === "major" ? C.orange : s === "warning" ? C.yellow : C.blue; }
function sevBg(s: string)      { return s === "critical" ? "#fef2f2" : s === "major" ? "#fff7ed" : s === "warning" ? "#fefce8" : "#eff6ff"; }

function metric(label: string, value: string, warn: boolean) {
  return React.createElement(View, { style: styles.metricBox },
    React.createElement(Text, { style: styles.metricLabel }, label),
    React.createElement(Text, { style: { ...styles.metricValue, color: warn ? C.red : C.dark } }, value),
  );
}

export async function generateDiagnosticPDF(record: DiagnosticRecord): Promise<Buffer> {
  const doc = React.createElement(Document, { title: `Diagnostic ${record.hostname}` },
    React.createElement(Page, { size: "A4", style: styles.page },

      // ── Header ──────────────────────────────────────────────────────────────
      React.createElement(View, { style: styles.header },
        React.createElement(View, {},
          React.createElement(Text, { style: styles.title }, "PaloMalo — Rapport de Diagnostic"),
          React.createElement(Text, { style: styles.subtitle }, `${record.hostname}  ·  ${record.model}  ·  PAN-OS ${record.version}`),
          React.createElement(Text, { style: styles.subtitle }, `Généré le ${new Date(record.timestamp).toLocaleString("fr-FR")}`),
          React.createElement(Text, { style: styles.subtitle }, `ID : ${record.id}  ·  Durée : ${record.durationMs}ms`),
        ),
        React.createElement(View, { style: { alignItems: "flex-end" } },
          React.createElement(Text, { style: { ...styles.scoreNum, color: scoreColor(record.healthScore) } }, `${record.healthScore}%`),
          React.createElement(Text, { style: styles.scoreLabel }, "Health Score"),
        ),
      ),

      // ── Métriques ────────────────────────────────────────────────────────────
      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, "Métriques clés"),
        React.createElement(View, { style: styles.row },
          metric("DP CPU moyen",  `${record.metrics.dpCpuAvg}%`,       record.metrics.dpCpuAvg > 80),
          metric("DP CPU max",    `${record.metrics.dpCpuMax}%`,       record.metrics.dpCpuMax > 80),
          metric("MP CPU",        `${record.metrics.mpCpu}%`,          record.metrics.mpCpu > 70),
          metric("Mémoire",       `${record.metrics.memoryPct}%`,      record.metrics.memoryPct > 80),
        ),
        React.createElement(View, { style: styles.row },
          metric("Sessions util.", `${record.metrics.sessionUtilPct}%`, record.metrics.sessionUtilPct > 70),
          metric("Packet rate",   `${(record.metrics.packetRate / 1000).toFixed(0)}K pps`, false),
          metric("Total drops",   record.metrics.totalDrops.toLocaleString(),              record.metrics.totalDrops > 1000),
          metric("Résumé issues", `${record.issueCount.critical}C / ${record.issueCount.major}M / ${record.issueCount.warning}W`, record.issueCount.critical > 0),
        ),
      ),

      // ── Issues ───────────────────────────────────────────────────────────────
      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle },
          record.issues.length > 0
            ? `Problèmes détectés (${record.issues.length})`
            : "Problèmes détectés"
        ),
        record.issues.length === 0
          ? React.createElement(Text, { style: { fontSize: 9, color: C.green } }, "✓ Aucun problème détecté — tous les systèmes fonctionnent normalement.")
          : React.createElement(React.Fragment, {},
              ...record.issues.slice(0, 25).map((issue, i) =>
                React.createElement(View, { key: i, style: { ...styles.issueBox, backgroundColor: sevBg(issue.severity) } },
                  React.createElement(View, { style: styles.issueHeader },
                    React.createElement(Text, { style: { ...styles.issueTitle, color: sevColor(issue.severity) } }, issue.title),
                    React.createElement(Text, { style: { ...styles.badge, color: sevColor(issue.severity) } }, issue.severity.toUpperCase()),
                  ),
                  React.createElement(Text, { style: styles.issueDesc }, issue.description),
                  React.createElement(Text, { style: styles.issueReco }, `→ ${issue.recommendation}`),
                )
              ),
              record.issues.length > 25
                ? React.createElement(Text, { style: { fontSize: 8, color: C.gray, marginTop: 4 } },
                    `… et ${record.issues.length - 25} autre(s) problème(s) non affichés.`
                  )
                : null,
            ),
      ),

      // ── Footer ───────────────────────────────────────────────────────────────
      React.createElement(View, { style: styles.footer, fixed: true },
        React.createElement(Text, {}, "PaloMalo — Diagnostic Palo Alto Networks · romain.jean@rj45.cloud"),
        React.createElement(Text, { render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `Page ${pageNumber} / ${totalPages}` }),
      ),
    )
  );

  return renderToBuffer(doc);
}
