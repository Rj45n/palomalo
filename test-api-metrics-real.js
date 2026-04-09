// Test de l'API /api/metrics avec les vraies interfaces
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

async function testMetricsAPI() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║       🧪 TEST API METRICS AVEC VRAIES INTERFACES 🧪         ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  try {
    // 1. Se connecter
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

    console.log("✅ Connexion réussie");

    // Extraire les cookies
    const setCookie = connectResponse.headers["set-cookie"];
    const cookies = setCookie ? setCookie.join("; ") : "";
    console.log(`🍪 Cookies: ${cookies.substring(0, 100)}...\n`);

    // 2. Récupérer les métriques
    console.log("📡 Récupération des métriques...");
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
    console.log("RÉSULTATS");
    console.log("━".repeat(64));

    console.log("\n📊 SYSTÈME:");
    console.log(`   CPU: ${metrics.system.cpu}%`);
    console.log(`   Memory: ${metrics.system.memory}%`);
    console.log(`   Uptime: ${metrics.system.uptime}`);

    console.log("\n📊 INFO:");
    console.log(`   Hostname: ${metrics.info.hostname}`);
    console.log(`   Model: ${metrics.info.model}`);
    console.log(`   Serial: ${metrics.info.serial}`);

    console.log("\n📊 SESSIONS:");
    console.log(`   Total: ${metrics.sessions.total}`);
    console.log(`   Active: ${metrics.sessions.active}`);
    console.log(`   TCP: ${metrics.sessions.tcp}`);
    console.log(`   UDP: ${metrics.sessions.udp}`);

    console.log("\n📊 INTERFACES:");
    console.log(`   Nombre total: ${metrics.interfaces.length}`);
    console.log("\n   Détails:");
    
    metrics.interfaces.forEach((iface, idx) => {
      if (idx < 10) { // Afficher les 10 premières
        console.log(`   ${idx + 1}. ${iface.name}`);
        console.log(`      Status: ${iface.status} | Speed: ${iface.speed}`);
        console.log(`      RX: ${(iface.rx / 1e9).toFixed(2)} GB | TX: ${(iface.tx / 1e9).toFixed(2)} GB`);
        console.log(`      Drops: RX=${iface.rxDrops} TX=${iface.txDrops}`);
      }
    });

    if (metrics.interfaces.length > 10) {
      console.log(`   ... et ${metrics.interfaces.length - 10} autres interfaces`);
    }

    console.log("\n" + "━".repeat(64));
    console.log("✅ Test terminé avec succès !");
    console.log("━".repeat(64));
  } catch (error) {
    console.error("\n❌ Erreur:", error.message);
    process.exit(1);
  }
}

testMetricsAPI();
