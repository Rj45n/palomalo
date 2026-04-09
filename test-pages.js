// Test rapide des nouvelles pages
const http = require("http");

const BASE_URL = "http://localhost:3001";
const FIREWALL_URL = "172.18.111.201";
const USERNAME = "Codex";
const PASSWORD = "C0d3x!34970";

async function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = http.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: options.method || "GET",
      headers: options.headers || {},
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({ status: res.statusCode, data, headers: res.headers });
      });
    });
    req.on("error", reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function testPages() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║              🧪 TEST DES NOUVELLES PAGES 🧪                 ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  let passed = 0;
  let failed = 0;

  // Connexion d'abord
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
    console.log("❌ Connexion échouée");
    return;
  }
  console.log("✅ Connexion réussie\n");

  const cookies = connectResponse.headers["set-cookie"]?.join("; ") || "";

  // Test des pages
  const pages = [
    { name: "Dashboard Overview", path: "/dashboard" },
    { name: "Performance", path: "/dashboard/performance" },
    { name: "Security", path: "/dashboard/security" },
    { name: "Hardware", path: "/dashboard/hardware" },
    { name: "Diagnostics", path: "/dashboard/diagnostics" },
  ];

  for (const page of pages) {
    try {
      console.log(`Testing: ${page.name}...`);
      const response = await httpRequest(`${BASE_URL}${page.path}`, {
        headers: { Cookie: cookies },
      });

      if (response.status === 200) {
        console.log(`✅ ${page.name}: OK (200)`);
        passed++;
      } else {
        console.log(`❌ ${page.name}: ERREUR (${response.status})`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${page.name}: ERREUR (${error.message})`);
      failed++;
    }
  }

  // Test de l'API metrics
  console.log("\n📡 Test API /api/metrics...");
  const metricsResponse = await httpRequest(`${BASE_URL}/api/metrics`, {
    headers: { Cookie: cookies },
  });

  if (metricsResponse.status === 200) {
    console.log("✅ API Metrics: OK");
    passed++;
  } else {
    console.log("❌ API Metrics: ERREUR");
    failed++;
  }

  // Résumé
  console.log("\n" + "━".repeat(64));
  console.log("RÉSUMÉ");
  console.log("━".repeat(64));
  console.log(`✅ Pages OK: ${passed}`);
  console.log(`❌ Pages ERREUR: ${failed}`);
  console.log("━".repeat(64));

  if (failed === 0) {
    console.log("\n🎉 TOUTES LES PAGES FONCTIONNENT !");
  }
}

testPages();
