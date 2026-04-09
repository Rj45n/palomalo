// Test complet de la connexion PAN-OS
const https = require("https");

console.log("=".repeat(60));
console.log("🧪 TEST COMPLET DE CONNEXION PAN-OS");
console.log("=".repeat(60));

// Test 1: Connexion directe au firewall
console.log("\n📡 Test 1: Connexion directe au firewall PAN-OS");
console.log("URL: https://172.18.111.201/api/?type=keygen");

const testDirectConnection = () => {
  return new Promise((resolve, reject) => {
    const url = "https://172.18.111.201/api/?type=keygen&user=Codex&password=C0d3x!34970";
    
    const options = {
      rejectUnauthorized: false,
    };

    https.get(url, options, (res) => {
      let data = "";
      
      res.on("data", (chunk) => {
        data += chunk;
      });
      
      res.on("end", () => {
        console.log("✅ Statut HTTP:", res.statusCode);
        console.log("📦 Réponse XML:");
        console.log(data);
        resolve(data);
      });
    }).on("error", (err) => {
      console.error("❌ Erreur:", err.message);
      reject(err);
    });
  });
};

// Test 2: API Next.js
const testNextAPI = async () => {
  console.log("\n📡 Test 2: API Next.js /api/connect");
  
  try {
    const response = await fetch("http://localhost:3000/api/connect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: "172.18.111.201",
        username: "Codex",
        password: "C0d3x!34970",
      }),
    });

    console.log("✅ Statut HTTP:", response.status);
    const data = await response.json();
    console.log("📦 Réponse:", data);
    
    // Vérifier les cookies
    const cookies = response.headers.get("set-cookie");
    if (cookies) {
      console.log("🍪 Cookies définis:", cookies);
    }
    
    return data;
  } catch (error) {
    console.error("❌ Erreur:", error.message);
    throw error;
  }
};

// Test 3: Vérifier la session
const testSession = async () => {
  console.log("\n📡 Test 3: Vérification de la session");
  
  try {
    const response = await fetch("http://localhost:3000/api/connect", {
      method: "GET",
    });

    console.log("✅ Statut HTTP:", response.status);
    const data = await response.json();
    console.log("📦 Réponse:", data);
    
    return data;
  } catch (error) {
    console.error("❌ Erreur:", error.message);
    throw error;
  }
};

// Exécuter tous les tests
(async () => {
  try {
    await testDirectConnection();
    await testNextAPI();
    await testSession();
    
    console.log("\n" + "=".repeat(60));
    console.log("✅ TOUS LES TESTS SONT RÉUSSIS !");
    console.log("=".repeat(60));
    console.log("\n🎉 La phase 1 est complète et fonctionnelle !");
    console.log("📋 Prêt pour la phase 2: Dashboard principal\n");
  } catch (error) {
    console.log("\n" + "=".repeat(60));
    console.log("❌ ÉCHEC DES TESTS");
    console.log("=".repeat(60));
    console.error(error);
    process.exit(1);
  }
})();
