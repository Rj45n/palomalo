// Test du moteur de diagnostic complet
const http = require("http");

const BASE_URL = "http://localhost:3001";
const FIREWALL_URL = "172.18.111.201";
const USERNAME = "Codex";
const PASSWORD = "C0d3x!34970";

async function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json, headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });
    req.on("error", reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function testDiagnosticEngine() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║         🧪 TEST MOTEUR DE DIAGNOSTIC IA 🧪                  ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  try {
    // 1. Connexion
    console.log("📡 Connexion au firewall...");
    const connectResponse = await httpRequest(`${BASE_URL}/api/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: FIREWALL_URL,
        username: USERNAME,
        password: PASSWORD,
      }),
    });

    if (connectResponse.status !== 200) {
      throw new Error("Connexion échouée");
    }

    console.log("✅ Connexion réussie\n");

    const setCookie = connectResponse.headers["set-cookie"];
    const cookies = setCookie ? setCookie.join("; ") : "";

    // 2. Récupérer les métriques live
    console.log("📡 Récupération des métriques live...");
    const metricsResponse = await httpRequest(`${BASE_URL}/api/metrics`, {
      method: "GET",
      headers: { Cookie: cookies },
    });

    if (metricsResponse.status !== 200) {
      throw new Error("Métriques échouées");
    }

    console.log("✅ Métriques récupérées\n");

    const liveMetrics = metricsResponse.data;

    // 3. Lancer le diagnostic
    console.log("🔍 Lancement du diagnostic...");
    const diagnosticResponse = await httpRequest(`${BASE_URL}/api/diagnostic`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ liveMetrics }),
    });

    if (diagnosticResponse.status !== 200) {
      throw new Error("Diagnostic échoué");
    }

    console.log("✅ Diagnostic terminé\n");

    const diagnostic = diagnosticResponse.data;

    // 4. Afficher les résultats
    console.log("━".repeat(64));
    console.log("RÉSULTATS DU DIAGNOSTIC");
    console.log("━".repeat(64));

    console.log(`\n🏥 SCORE DE SANTÉ: ${diagnostic.healthScore}/100`);
    
    const scoreColor = diagnostic.healthScore >= 90 ? "✅" : 
                       diagnostic.healthScore >= 70 ? "⚠️" : "🔴";
    console.log(`${scoreColor} État: ${
      diagnostic.healthScore >= 90 ? "Excellent" :
      diagnostic.healthScore >= 70 ? "Bon" :
      diagnostic.healthScore >= 50 ? "Moyen" : "Critique"
    }\n`);

    console.log(`📊 PROBLÈMES DÉTECTÉS: ${diagnostic.issues.length}\n`);

    // Compter par sévérité
    const critical = diagnostic.issues.filter((i) => i.severity === "critical").length;
    const major = diagnostic.issues.filter((i) => i.severity === "major").length;
    const warning = diagnostic.issues.filter((i) => i.severity === "warning").length;
    const info = diagnostic.issues.filter((i) => i.severity === "info").length;

    console.log(`   🔴 Critiques: ${critical}`);
    console.log(`   🟠 Majeurs: ${major}`);
    console.log(`   🟡 Warnings: ${warning}`);
    console.log(`   🔵 Info: ${info}\n`);

    // Afficher les problèmes
    if (diagnostic.issues.length > 0) {
      console.log("━".repeat(64));
      console.log("DÉTAILS DES PROBLÈMES");
      console.log("━".repeat(64));

      diagnostic.issues.slice(0, 5).forEach((issue, idx) => {
        const icon = issue.severity === "critical" ? "🔴" :
                     issue.severity === "major" ? "🟠" :
                     issue.severity === "warning" ? "🟡" : "🔵";
        
        console.log(`\n${icon} ${idx + 1}. [${issue.severity.toUpperCase()}] ${issue.title}`);
        console.log(`   Catégorie: ${issue.category}`);
        console.log(`   Description: ${issue.description}`);
        console.log(`   Impact: ${issue.impact}`);
        console.log(`   Recommandation: ${issue.recommendation.split("\n")[0]}`);
        
        if (issue.cliCommands && issue.cliCommands.length > 0) {
          console.log(`   Commandes CLI:`);
          issue.cliCommands.forEach((cmd) => {
            console.log(`      - ${cmd}`);
          });
        }
      });

      if (diagnostic.issues.length > 5) {
        console.log(`\n   ... et ${diagnostic.issues.length - 5} autres problèmes`);
      }
    }

    console.log("\n" + "━".repeat(64));
    console.log("✅ TEST RÉUSSI - MOTEUR DE DIAGNOSTIC FONCTIONNEL");
    console.log("━".repeat(64));
    console.log("\n🚀 Le diagnostic IA est opérationnel !");
    console.log("   Accédez au dashboard: http://localhost:3001/dashboard\n");
  } catch (error) {
    console.error("\n❌ Erreur:", error.message);
    process.exit(1);
  }
}

testDiagnosticEngine();
