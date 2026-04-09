// Test des commandes PAN-OS directement
const https = require("https");

const FIREWALL_URL = "172.18.111.201";
const USERNAME = "Codex";
const PASSWORD = "C0d3x!34970";

console.log("╔══════════════════════════════════════════════════════════════╗");
console.log("║                                                              ║");
console.log("║         🧪 TEST COMMANDES PAN-OS DIRECTES 🧪                 ║");
console.log("║                                                              ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");

// Fonction pour faire une requête HTTPS
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

async function testCommands() {
  try {
    // Étape 1: Obtenir la clé API
    console.log("📡 Étape 1: Génération de la clé API...");
    const keygenUrl = `https://${FIREWALL_URL}/api/?type=keygen&user=${encodeURIComponent(
      USERNAME
    )}&password=${encodeURIComponent(PASSWORD)}`;

    const keygenResponse = await httpsRequest(keygenUrl);
    console.log("✅ Clé API obtenue");

    // Extraire la clé (parsing simple)
    const keyMatch = keygenResponse.match(/<key>([^<]+)<\/key>/);
    if (!keyMatch) {
      throw new Error("Impossible d'extraire la clé API");
    }
    const apiKey = keyMatch[1];
    console.log(`🔑 Clé: ${apiKey.substring(0, 20)}...\n`);

    // Étape 2: Tester les commandes
    const commands = [
      {
        name: "show system resources",
        xml: "<show><system><resources></resources></system></show>",
      },
      {
        name: "show session info",
        xml: "<show><session><info></info></session></show>",
      },
      {
        name: "show interface all",
        xml: "<show><interface><all></all></interface></show>",
      },
      {
        name: "show system info",
        xml: "<show><system><info></info></system></show>",
      },
    ];

    console.log("━".repeat(64));
    console.log("TEST DES COMMANDES PAN-OS");
    console.log("━".repeat(64));

    for (const cmd of commands) {
      console.log(`\n📋 Test: ${cmd.name}`);
      console.log(`   XML: ${cmd.xml}`);

      try {
        const cmdUrl = `https://${FIREWALL_URL}/api/?type=op&cmd=${encodeURIComponent(
          cmd.xml
        )}&key=${apiKey}`;

        const response = await httpsRequest(cmdUrl);

        // Vérifier si la réponse contient "success"
        if (response.includes('status = \'success\'') || response.includes('status="success"')) {
          console.log("   ✅ Commande réussie");
          
          // Afficher un extrait de la réponse
          const lines = response.split("\n").slice(0, 5);
          console.log("   Extrait de la réponse:");
          lines.forEach((line) => {
            if (line.trim()) console.log(`   ${line.trim()}`);
          });
        } else {
          console.log("   ⚠️  Réponse inattendue");
          console.log("   Début de la réponse:", response.substring(0, 200));
        }
      } catch (error) {
        console.log(`   ❌ Erreur: ${error.message}`);
      }
    }

    console.log("\n" + "━".repeat(64));
    console.log("✅ Tests terminés");
    console.log("━".repeat(64));
    console.log("\nSi toutes les commandes ont réussi, vous pouvez activer");
    console.log("l'API réelle dans app/dashboard/page.tsx\n");
  } catch (error) {
    console.error("\n❌ Erreur:", error.message);
    process.exit(1);
  }
}

testCommands();
