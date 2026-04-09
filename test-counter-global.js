// Test de la commande "show counter global"
const https = require("https");

const FIREWALL_URL = "172.18.111.201";
const USERNAME = "Codex";
const PASSWORD = "C0d3x!34970";

function httpsRequest(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { rejectUnauthorized: false }, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve({ status: res.statusCode, data }));
      })
      .on("error", reject);
  });
}

async function testCounterGlobal() {
  console.log("🧪 Test: show counter global\n");

  try {
    // Obtenir la clé API
    const keygenUrl = `https://${FIREWALL_URL}/api/?type=keygen&user=${encodeURIComponent(
      USERNAME
    )}&password=${encodeURIComponent(PASSWORD)}`;
    const keygenResponse = await httpsRequest(keygenUrl);
    const keyMatch = keygenResponse.data.match(/<key>([^<]+)<\/key>/);
    const apiKey = keyMatch[1];
    console.log("✅ Clé API obtenue\n");

    // Test "show counter global"
    const xmlCommand = "<show><counter><global></global></counter></show>";
    const cmdUrl = `https://${FIREWALL_URL}/api/?type=op&cmd=${encodeURIComponent(
      xmlCommand
    )}&key=${apiKey}`;

    console.log("📡 Commande: show counter global");
    console.log(`   XML: ${xmlCommand}\n`);

    const response = await httpsRequest(cmdUrl);
    
    console.log("📥 Status:", response.status);
    console.log("\n📦 Réponse (premiers 2000 caractères):");
    console.log("━".repeat(64));
    console.log(response.data.substring(0, 2000));
    console.log("━".repeat(64));
    
    if (response.data.includes('status = \'success\'') || response.data.includes('status="success"')) {
      console.log("\n✅ Commande réussie !");
      console.log("\nCette commande peut contenir des infos sur les interfaces.");
    } else {
      console.log("\n❌ Commande échouée");
    }
  } catch (error) {
    console.error("\n❌ Erreur:", error.message);
  }
}

testCounterGlobal();
