// Test de l'API REST PAN-OS pour les interfaces
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

async function testRestAPI() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║            🧪 TEST API REST PAN-OS 🧪                        ║");
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

    // Endpoints REST à tester
    const endpoints = [
      "/restapi/v10.2/Network/Interfaces",
      "/restapi/v10.2/Network/EthernetInterfaces",
      "/restapi/v10.2/Network/AggregateInterfaces",
      "/api/?type=config&action=get&xpath=/config/devices/entry[@name='localhost.localdomain']/network/interface",
      "/api/?type=config&action=show&xpath=/config/devices/entry[@name='localhost.localdomain']/network/interface/ethernet",
      "/api/?type=config&action=show&xpath=/config/devices/entry[@name='localhost.localdomain']/network/interface/aggregate-ethernet",
    ];

    console.log("━".repeat(64));
    console.log("TEST DES ENDPOINTS REST");
    console.log("━".repeat(64));

    for (const endpoint of endpoints) {
      console.log(`\n📋 Endpoint: ${endpoint}`);

      try {
        const url = `https://${FIREWALL_URL}${endpoint}${
          endpoint.includes("?") ? "&" : "?"
        }key=${apiKey}`;

        const response = await httpsRequest(url);
        console.log(`   Status: ${response.status}`);

        if (response.status === 200) {
          console.log("   ✅ Succès");
          console.log("   Extrait (200 premiers caractères):");
          console.log(`   ${response.data.substring(0, 200)}`);
        } else {
          console.log(`   ❌ Échec (${response.status})`);
        }
      } catch (error) {
        console.log(`   ❌ Erreur: ${error.message}`);
      }
    }

    console.log("\n" + "━".repeat(64));
    console.log("Tests terminés");
    console.log("━".repeat(64));
  } catch (error) {
    console.error("\n❌ Erreur:", error.message);
  }
}

testRestAPI();
