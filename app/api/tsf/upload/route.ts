import { NextRequest, NextResponse } from "next/server";
import { parseTSF, parseTSFComplete } from "@/lib/tsf-parser";

/**
 * API Route pour l'upload de Tech Support File
 * POST /api/tsf/upload
 * 
 * Query params:
 * - complete=true: Parser avec le nouveau parser complet TAC-Level
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const useComplete = formData.get("complete") === "true";

    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 }
      );
    }

    // Vérifier l'extension
    if (!file.name.endsWith(".tgz") && !file.name.endsWith(".tar.gz")) {
      return NextResponse.json(
        { error: "Format de fichier invalide. Seuls les fichiers .tgz et .tar.gz sont acceptés." },
        { status: 400 }
      );
    }

    // Vérifier la taille (max 500MB)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Fichier trop volumineux. Taille maximale : 500MB" },
        { status: 400 }
      );
    }

    console.log(`📦 Upload TSF: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`📊 Mode de parsing: ${useComplete ? "Complet TAC-Level" : "Basique"}`);

    // Convertir en Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parser le TSF (parsing basique toujours effectué)
    console.log("🔍 Parsing basique du TSF...");
    const tsfData = await parseTSF(buffer, file.name);

    console.log("✅ TSF parsé avec succès (basique)");
    console.log(`   - Hostname: ${tsfData.system.hostname}`);
    console.log(`   - Model: ${tsfData.system.model}`);
    console.log(`   - Version: ${tsfData.system.version}`);
    console.log(`   - Processes: ${tsfData.processes.length}`);
    console.log(`   - Logs: ${tsfData.logs.errors.length} errors, ${tsfData.logs.warnings.length} warnings`);

    // Parsing complet si demandé
    let dataComplete = null;
    if (useComplete) {
      console.log("🔍 Parsing complet TAC-Level...");
      try {
        dataComplete = await parseTSFComplete(buffer, file.name);
        console.log("✅ TSF parsé avec succès (complet)");
        console.log(`   - Health Score: ${dataComplete.healthScore}/100`);
        console.log(`   - Issues: ${dataComplete.issues.length}`);
        console.log(`   - Interfaces: ${dataComplete.interfaces.length}`);
        console.log(`   - VPN Tunnels: ${dataComplete.vpn.ipsecTunnels.length}`);
        console.log(`   - Parse Time: ${dataComplete.metadata.parseTime}ms`);
      } catch (error) {
        console.error("⚠️ Erreur parsing complet, utilisation du parsing basique:", error);
      }
    }

    return NextResponse.json({
      success: true,
      data: tsfData,
      dataComplete,
    });
  } catch (error) {
    console.error("❌ Erreur lors du parsing du TSF:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur lors du parsing du TSF",
      },
      { status: 500 }
    );
  }
}
