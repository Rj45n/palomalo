// Test final complet - Interfaces réelles
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

async function testFinalInterfaces() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║         🧪 TEST FINAL - INTERFACES RÉELLES 🧪               ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // Test 1 : Connexion
    console.log("━".repeat(64));
    console.log("TEST 1 : Connexion au firewall");
    console.log("━".repeat(64));
    
    const connectResponse = await httpRequest(`${BASE_URL}/api/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: FIREWALL_URL,
        username: USERNAME,
        password: PASSWORD,
      }),
    });

    if (connectResponse.status === 200) {
      console.log("✅ Test 1 réussi : Connexion OK");
      testsPassed++;
    } else {
      console.log("❌ Test 1 échoué : Connexion KO");
      testsFailed++;
      throw new Error("Connexion échouée");
    }

    const setCookie = connectResponse.headers["set-cookie"];
    const cookies = setCookie ? setCookie.join("; ") : "";

    // Test 2 : Récupération des métriques
    console.log("\n━".repeat(64));
    console.log("TEST 2 : Récupération des métriques");
    console.log("━".repeat(64));
    
    const metricsResponse = await httpRequest(`${BASE_URL}/api/metrics`, {
      method: "GET",
      headers: { Cookie: cookies },
    });

    if (metricsResponse.status === 200) {
      console.log("✅ Test 2 réussi : Métriques récupérées");
      testsPassed++;
    } else {
      console.log("❌ Test 2 échoué : Métriques KO");
      testsFailed++;
      throw new Error("Métriques échouées");
    }

    const metrics = metricsResponse.data;

    // Test 3 : Vérifier le nombre d'interfaces
    console.log("\n━".repeat(64));
    console.log("TEST 3 : Nombre d'interfaces");
    console.log("━".repeat(64));
    
    const interfaceCount = metrics.interfaces.length;
    console.log(`   Nombre d'interfaces : ${interfaceCount}`);
    
    if (interfaceCount > 100) {
      console.log("✅ Test 3 réussi : Plus de 100 interfaces");
      testsPassed++;
    } else {
      console.log("❌ Test 3 échoué : Moins de 100 interfaces");
      testsFailed++;
    }

    // Test 4 : Vérifier les commentaires
    console.log("\n━".repeat(64));
    console.log("TEST 4 : Commentaires des interfaces");
    console.log("━".repeat(64));
    
    const interfacesWithComments = metrics.interfaces.filter(
      (iface) => iface.name.includes("(") && iface.name.includes(")")
    );
    
    console.log(`   Interfaces avec commentaires : ${interfacesWithComments.length}`);
    console.log(`   Exemples :`);
    interfacesWithComments.slice(0, 5).forEach((iface) => {
      console.log(`      - ${iface.name}`);
    });
    
    if (interfacesWithComments.length > 10) {
      console.log("✅ Test 4 réussi : Commentaires présents");
      testsPassed++;
    } else {
      console.log("❌ Test 4 échoué : Pas assez de commentaires");
      testsFailed++;
    }

    // Test 5 : Vérifier les interfaces AE
    console.log("\n━".repeat(64));
    console.log("TEST 5 : Interfaces AE (Aggregate Ethernet)");
    console.log("━".repeat(64));
    
    const aeInterfaces = metrics.interfaces.filter((iface) =>
      iface.name.startsWith("ae")
    );
    
    console.log(`   Interfaces AE : ${aeInterfaces.length}`);
    console.log(`   Exemples :`);
    aeInterfaces.slice(0, 5).forEach((iface) => {
      console.log(`      - ${iface.name}`);
    });
    
    if (aeInterfaces.length > 5) {
      console.log("✅ Test 5 réussi : Interfaces AE présentes");
      testsPassed++;
    } else {
      console.log("❌ Test 5 échoué : Pas assez d'interfaces AE");
      testsFailed++;
    }

    // Test 6 : Vérifier les sous-interfaces AE
    console.log("\n━".repeat(64));
    console.log("TEST 6 : Sous-interfaces AE (VLANs)");
    console.log("━".repeat(64));
    
    const subAeInterfaces = metrics.interfaces.filter((iface) =>
      /^ae\d+\.\d+/.test(iface.name)
    );
    
    console.log(`   Sous-interfaces AE : ${subAeInterfaces.length}`);
    console.log(`   Exemples :`);
    subAeInterfaces.slice(0, 5).forEach((iface) => {
      console.log(`      - ${iface.name}`);
    });
    
    if (subAeInterfaces.length > 5) {
      console.log("✅ Test 6 réussi : Sous-interfaces AE présentes");
      testsPassed++;
    } else {
      console.log("❌ Test 6 échoué : Pas assez de sous-interfaces AE");
      testsFailed++;
    }

    // Test 7 : Vérifier les interfaces ethernet
    console.log("\n━".repeat(64));
    console.log("TEST 7 : Interfaces Ethernet");
    console.log("━".repeat(64));
    
    const ethernetInterfaces = metrics.interfaces.filter((iface) =>
      iface.name.startsWith("ethernet")
    );
    
    console.log(`   Interfaces Ethernet : ${ethernetInterfaces.length}`);
    console.log(`   Exemples :`);
    ethernetInterfaces.slice(0, 5).forEach((iface) => {
      console.log(`      - ${iface.name}`);
    });
    
    if (ethernetInterfaces.length > 10) {
      console.log("✅ Test 7 réussi : Interfaces Ethernet présentes");
      testsPassed++;
    } else {
      console.log("❌ Test 7 échoué : Pas assez d'interfaces Ethernet");
      testsFailed++;
    }

    // Test 8 : Vérifier les infos système
    console.log("\n━".repeat(64));
    console.log("TEST 8 : Informations système");
    console.log("━".repeat(64));
    
    console.log(`   Hostname : ${metrics.info.hostname}`);
    console.log(`   Model : ${metrics.info.model}`);
    console.log(`   Serial : ${metrics.info.serial}`);
    
    if (
      metrics.info.hostname &&
      metrics.info.model === "PA-5220" &&
      metrics.info.serial
    ) {
      console.log("✅ Test 8 réussi : Infos système correctes");
      testsPassed++;
    } else {
      console.log("❌ Test 8 échoué : Infos système incorrectes");
      testsFailed++;
    }

    // Résumé
    console.log("\n" + "━".repeat(64));
    console.log("RÉSUMÉ DES TESTS");
    console.log("━".repeat(64));
    console.log(`✅ Tests réussis : ${testsPassed}/8`);
    console.log(`❌ Tests échoués : ${testsFailed}/8`);
    
    if (testsFailed === 0) {
      console.log("\n🎉 TOUS LES TESTS SONT PASSÉS ! 🎉");
      console.log("━".repeat(64));
      console.log("\n✅ Les interfaces réelles sont correctement affichées !");
      console.log("✅ Le dashboard est prêt pour la production !");
      console.log("\n🚀 Vous pouvez maintenant utiliser le dashboard :");
      console.log("   http://localhost:3001");
      console.log("━".repeat(64));
    } else {
      console.log("\n⚠️  CERTAINS TESTS ONT ÉCHOUÉ");
      console.log("━".repeat(64));
    }

  } catch (error) {
    console.error("\n❌ Erreur:", error.message);
    process.exit(1);
  }
}

testFinalInterfaces();
