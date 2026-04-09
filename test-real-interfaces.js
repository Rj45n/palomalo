// Test de récupération des vraies interfaces
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

async function testRealInterfaces() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║       🧪 TEST RÉCUPÉRATION VRAIES INTERFACES 🧪              ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  try {
    // Obtenir la clé API
    const keygenUrl = `https://${FIREWALL_URL}/api/?type=keygen&user=${encodeURIComponent(
      USERNAME
    )}&password=${encodeURIComponent(PASSWORD)}`;
    const keygenResponse = await httpsRequest(keygenUrl);
    const keyMatch = keygenResponse.data.match(/<key>([^<]+)<\/key>/);
    const apiKey = keyMatch[1];
    console.log("✅ Clé API obtenue\n");

    // 1. Récupérer la config ethernet
    console.log("📡 Récupération config ethernet...");
    const ethernetXpath = "/config/devices/entry[@name='localhost.localdomain']/network/interface/ethernet";
    const ethernetUrl = `https://${FIREWALL_URL}/api/?type=config&action=show&xpath=${encodeURIComponent(
      ethernetXpath
    )}&key=${apiKey}`;
    const ethernetResponse = await httpsRequest(ethernetUrl);
    
    console.log("📦 Config ethernet (1000 premiers caractères):");
    console.log(ethernetResponse.data.substring(0, 1000));
    console.log("\n");

    // 2. Récupérer la config AE
    console.log("📡 Récupération config aggregate-ethernet...");
    const aeXpath = "/config/devices/entry[@name='localhost.localdomain']/network/interface/aggregate-ethernet";
    const aeUrl = `https://${FIREWALL_URL}/api/?type=config&action=show&xpath=${encodeURIComponent(
      aeXpath
    )}&key=${apiKey}`;
    const aeResponse = await httpsRequest(aeUrl);
    
    console.log("📦 Config AE (1000 premiers caractères):");
    console.log(aeResponse.data.substring(0, 1000));
    console.log("\n");

    // 3. Test "show counter interface" pour une interface spécifique
    console.log("📡 Test 'show counter interface ethernet1/1'...");
    const counterCmd = "<show><counter><interface>ethernet1/1</interface></counter></show>";
    const counterUrl = `https://${FIREWALL_URL}/api/?type=op&cmd=${encodeURIComponent(
      counterCmd
    )}&key=${apiKey}`;
    const counterResponse = await httpsRequest(counterUrl);
    
    console.log("📦 Stats ethernet1/1 (1000 premiers caractères):");
    console.log(counterResponse.data.substring(0, 1000));
    console.log("\n");

    // 4. Test pour ae1
    console.log("📡 Test 'show counter interface ae1'...");
    const ae1Cmd = "<show><counter><interface>ae1</interface></counter></show>";
    const ae1Url = `https://${FIREWALL_URL}/api/?type=op&cmd=${encodeURIComponent(
      ae1Cmd
    )}&key=${apiKey}`;
    const ae1Response = await httpsRequest(ae1Url);
    
    console.log("📦 Stats ae1 (1000 premiers caractères):");
    console.log(ae1Response.data.substring(0, 1000));
    console.log("\n");

    console.log("━".repeat(64));
    console.log("✅ Tests terminés avec succès !");
    console.log("━".repeat(64));
  } catch (error) {
    console.error("\n❌ Erreur:", error.message);
  }
}

testRealInterfaces();
