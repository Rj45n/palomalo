import { NextRequest, NextResponse } from "next/server";
import { 
  analyzeFirewall, 
  analyzeAdvancedMetrics,
  correlateMetrics,
  calculateHealthScore 
} from "@/lib/diagnostic-engine";
import { createDeepAnalysis } from "@/lib/tsf-analyzer";
import { DashboardMetrics, TSFData, AdvancedMetrics, DiagnosticIssue } from "@/types";

/**
 * API Route pour le diagnostic complet TAC-level
 * POST /api/diagnostic
 * Body: { 
 *   liveMetrics: DashboardMetrics, 
 *   advancedMetrics?: AdvancedMetrics,
 *   tsfData?: TSFData 
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { liveMetrics, advancedMetrics, tsfData } = body;

    if (!liveMetrics) {
      return NextResponse.json(
        { error: "Métriques live requises" },
        { status: 400 }
      );
    }

    console.log("🔍 Analyse diagnostic TAC-level en cours...");

    let allIssues: DiagnosticIssue[] = [];

    // Analyse basique (métriques standard)
    const basicIssues = analyzeFirewall(liveMetrics, tsfData);
    allIssues.push(...basicIssues);
    console.log(`   📊 Analyse basique: ${basicIssues.length} problèmes`);

    // Analyse avancée si métriques disponibles
    if (advancedMetrics) {
      const advancedIssues = analyzeAdvancedMetrics(advancedMetrics);
      allIssues.push(...advancedIssues);
      console.log(`   🔬 Analyse avancée: ${advancedIssues.length} problèmes`);
    }

    // Corrélation live + TSF si TSF disponible
    let correlatedIssues: any[] = [];
    if (tsfData && advancedMetrics) {
      const tsfDeep = createDeepAnalysis(tsfData);
      correlatedIssues = correlateMetrics(liveMetrics, advancedMetrics, tsfDeep);
      allIssues.push(...correlatedIssues);
      console.log(`   🔗 Corrélation: ${correlatedIssues.length} problèmes`);
    }

    // Calculer le score de santé
    const healthScore = calculateHealthScore(allIssues);

    // Statistiques par catégorie
    const stats = {
      critical: allIssues.filter(i => i.severity === "critical").length,
      major: allIssues.filter(i => i.severity === "major").length,
      warning: allIssues.filter(i => i.severity === "warning").length,
      info: allIssues.filter(i => i.severity === "info").length,
    };

    console.log(`✅ Analyse terminée: ${allIssues.length} problèmes détectés`);
    console.log(`   Health Score: ${healthScore}/100`);
    console.log(`   Critical: ${stats.critical}, Major: ${stats.major}, Warning: ${stats.warning}`);

    return NextResponse.json({
      success: true,
      issues: allIssues,
      healthScore,
      stats,
      analyzedAt: new Date().toISOString(),
      analysisType: advancedMetrics ? "tac-level" : "standard",
      tsfIncluded: !!tsfData,
    });
  } catch (error) {
    console.error("❌ Erreur lors du diagnostic:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur lors du diagnostic",
      },
      { status: 500 }
    );
  }
}
