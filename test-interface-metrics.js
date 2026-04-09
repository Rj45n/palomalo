// Test des métriques d'interfaces améliorées
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

async function testInterfaceMetrics() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║      🧪 TEST MÉTRIQUES INTERFACES AMÉLIORÉES 🧪             ║");
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
      throw new Error(`Connexion échouée: ${JSON.stringify(connectResponse.data)}`);
    }

    console.log("✅ Connexion réussie\n");

    const setCookie = connectResponse.headers["set-cookie"];
    const cookies = setCookie ? setCookie.join("; ") : "";

    // 2. Récupérer les métriques
    console.log("📡 Récupération des métriques avec stats d'interfaces...");
    const metricsResponse = await httpRequest(`${BASE_URL}/api/metrics`, {
      method: "GET",
      headers: { Cookie: cookies },
    });

    if (metricsResponse.status !== 200) {
      throw new Error(`Métriques échouées: ${JSON.stringify(metricsResponse.data)}`);
    }

    console.log("✅ Métriques récupérées\n");

    const metrics = metricsResponse.data;

    // 3. Afficher les résultats
    console.log("━".repeat(64));
    console.log("RÉSULTATS - MÉTRIQUES INTERFACES");
    console.log("━".repeat(64));

    console.log(`\n📊 INTERFACES: ${metrics.interfaces.length} au total\n`);

    // Afficher les 5 premières interfaces avec détails
    console.log("Détails des 5 premières interfaces:\n");
    metrics.interfaces.slice(0, 5).forEach((iface, idx) => {
      console.log(`${idx + 1}. ${iface.name}`);
      console.log(`   Status: ${iface.status}`);
      console.log(`   Speed: ${iface.speed} ${iface.duplex ? `(${iface.duplex})` : ""}`);
      console.log(`   RX: ${(iface.rx / 1e9).toFixed(2)} GB | TX: ${(iface.tx / 1e9).toFixed(2)} GB`);
      console.log(`   Packets: RX=${iface.rxPackets.toLocaleString()} TX=${iface.txPackets.toLocaleString()}`);
      console.log(`   Errors: RX=${iface.rxErrors} TX=${iface.txErrors}`);
      console.log(`   Drops: RX=${iface.rxDrops} TX=${iface.txDrops}`);
      if (iface.utilization !== undefined) {
        console.log(`   Utilization: ${iface.utilization}%`);
      }
      console.log("");
    });

    // 4. Afficher les problèmes détectés
    if (metrics.interfaceIssues && metrics.interfaceIssues.length > 0) {
      console.log("━".repeat(64));
      console.log("PROBLÈMES DÉTECTÉS");
      console.log("━".repeat(64));
      console.log(`\n${metrics.interfaceIssues.length} problème(s) détecté(s):\n`);

      metrics.interfaceIssues.forEach((issue, idx) => {
        const icon = issue.severity === "critical" ? "🔴" : issue.severity === "warning" ? "🟠" : "🔵";
        console.log(`${icon} ${idx + 1}. [${issue.severity.toUpperCase()}] ${issue.interface}`);
        console.log(`   Type: ${issue.type}`);
        console.log(`   Message: ${issue.message}`);
        console.log(`   Recommandation: ${issue.recommendation}`);
        if (issue.cliCommand) {
          console.log(`   Commande CLI: ${issue.cliCommand}`);
        }
        console.log("");
      });
    } else {
      console.log("\n✅ Aucun problème détecté sur les interfaces\n");
    }

    // 5. Statistiques globales
    console.log("━".repeat(64));
    console.log("STATISTIQUES GLOBALES");
    console.log("━".repeat(64));

    const upInterfaces = metrics.interfaces.filter((i) => i.status === "up").length;
    const downInterfaces = metrics.interfaces.filter((i) => i.status === "down").length;
    const withErrors = metrics.interfaces.filter((i) => i.rxErrors > 0 || i.txErrors > 0).length;
    const withDrops = metrics.interfaces.filter((i) => i.rxDrops > 0 || i.txDrops > 0).length;
    const highUtil = metrics.interfaces.filter((i) => (i.utilization || 0) > 85).length;

    console.log(`\n✅ Interfaces UP: ${upInterfaces}`);
    console.log(`❌ Interfaces DOWN: ${downInterfaces}`);
    console.log(`⚠️  Avec erreurs: ${withErrors}`);
    console.log(`⚠️  Avec drops: ${withDrops}`);
    console.log(`⚠️  Utilisation >85%: ${highUtil}\n`);

    console.log("━".repeat(64));
    console.log("✅ TEST TERMINÉ AVEC SUCCÈS");
    console.log("━".repeat(64));
    console.log("\n🚀 Le dashboard est prêt avec les métriques d'interfaces complètes !");
    console.log("   http://localhost:3001/dashboard\n");
  } catch (error) {
    console.error("\n❌ Erreur:", error.message);
    process.exit(1);
  }
}

testInterfaceMetrics();
