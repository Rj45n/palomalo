// Test pour trouver la bonne commande d'interfaces
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
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      })
      .on("error", reject);
  });
}

async function testInterfaceCommands() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║         🧪 TEST COMMANDES INTERFACES PAN-OS 🧪               ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  try {
    // Obtenir la clé API
    console.log("📡 Génération de la clé API...");
    const keygenUrl = `https://${FIREWALL_URL}/api/?type=keygen&user=${encodeURIComponent(
      USERNAME
    )}&password=${encodeURIComponent(PASSWORD)}`;
    const keygenResponse = await httpsRequest(keygenUrl);
    const keyMatch = keygenResponse.match(/<key>([^<]+)<\/key>/);
    const apiKey = keyMatch[1];
    console.log("✅ Clé API obtenue\n");

    // Commandes à tester
    const commands = [
      "show interface all",
      "show interface logical",
      "show interface hardware",
      "show interface ethernet1/1",
      "show interface ae1",
      "show counter interface all",
      "show counter interface",
    ];

    console.log("━".repeat(64));
    console.log("TEST DES COMMANDES");
    console.log("━".repeat(64));

    for (const cmd of commands) {
      console.log(`\n📋 Commande: ${cmd}`);
      
      // Construire le XML
      const parts = cmd.split(" ");
      let xmlCommand = "";
      for (const part of parts) {
        xmlCommand += `<${part}>`;
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        xmlCommand += `</${parts[i]}>`;
      }

      console.log(`   XML: ${xmlCommand}`);

      try {
        const cmdUrl = `https://${FIREWALL_URL}/api/?type=op&cmd=${encodeURIComponent(
          xmlCommand
        )}&key=${apiKey}`;

        const response = await httpsRequest(cmdUrl);

        if (response.includes('status = \'success\'') || response.includes('status="success"')) {
          console.log("   ✅ Succès");
          
          // Afficher un extrait
          const lines = response.split("\n").slice(0, 10);
          console.log("   Extrait:");
          lines.forEach((line, idx) => {
            if (line.trim() && idx < 8) {
              console.log(`   ${line.trim().substring(0, 80)}`);
            }
          });
        } else {
          console.log("   ❌ Échec");
          console.log("   Réponse:", response.substring(0, 200));
        }
      } catch (error) {
        console.log(`   ❌ Erreur: ${error.message}`);
      }
    }

    console.log("\n" + "━".repeat(64));
    console.log("✅ Tests terminés");
    console.log("━".repeat(64));
  } catch (error) {
    console.error("\n❌ Erreur:", error.message);
    process.exit(1);
  }
}

testInterfaceCommands();
