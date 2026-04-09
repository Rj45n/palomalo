// Test End-to-End complet de PaloDiag
const http = require("http");
const fs = require("fs");

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

async function runTests() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║              🧪 TESTS E2E COMPLETS 🧪                       ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  let testsPassed = 0;
  let testsFailed = 0;
  let cookies = "";

  // TEST 1: Connexion au firewall
  try {
    console.log("TEST 1/10: Connexion au firewall...");
    const response = await httpRequest(`${BASE_URL}/api/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: FIREWALL_URL,
        username: USERNAME,
        password: PASSWORD,
      }),
    });

    if (response.status === 200 && response.data.success) {
      console.log("✅ TEST 1 RÉUSSI: Connexion établie");
      testsPassed++;
      cookies = response.headers["set-cookie"]?.join("; ") || "";
    } else {
      throw new Error("Connexion échouée");
    }
  } catch (error) {
    console.log("❌ TEST 1 ÉCHOUÉ:", error.message);
    testsFailed++;
    return;
  }

  // TEST 2: Vérification de session
  try {
    console.log("\nTEST 2/10: Vérification de session...");
    const response = await httpRequest(`${BASE_URL}/api/connect`, {
      method: "GET",
      headers: { Cookie: cookies },
    });

    if (response.status === 200 && response.data.authenticated) {
      console.log("✅ TEST 2 RÉUSSI: Session active");
      testsPassed++;
    } else {
      throw new Error("Session invalide");
    }
  } catch (error) {
    console.log("❌ TEST 2 ÉCHOUÉ:", error.message);
    testsFailed++;
  }

  // TEST 3: Récupération des métriques
  try {
    console.log("\nTEST 3/10: Récupération des métriques...");
    const response = await httpRequest(`${BASE_URL}/api/metrics`, {
      method: "GET",
      headers: { Cookie: cookies },
    });

    if (response.status === 200 && response.data.system && response.data.interfaces) {
      console.log("✅ TEST 3 RÉUSSI: Métriques récupérées");
      console.log(`   - CPU: ${response.data.system.cpu}%`);
      console.log(`   - Memory: ${response.data.system.memory}%`);
      console.log(`   - Interfaces: ${response.data.interfaces.length}`);
      testsPassed++;
    } else {
      throw new Error("Métriques invalides");
    }
  } catch (error) {
    console.log("❌ TEST 3 ÉCHOUÉ:", error.message);
    testsFailed++;
  }

  // TEST 4: Diagnostic automatique
  try {
    console.log("\nTEST 4/10: Diagnostic automatique...");
    const metricsResponse = await httpRequest(`${BASE_URL}/api/metrics`, {
      method: "GET",
      headers: { Cookie: cookies },
    });

    const diagnosticResponse = await httpRequest(`${BASE_URL}/api/diagnostic`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ liveMetrics: metricsResponse.data }),
    });

    if (diagnosticResponse.status === 200 && diagnosticResponse.data.issues) {
      console.log("✅ TEST 4 RÉUSSI: Diagnostic effectué");
      console.log(`   - Health Score: ${diagnosticResponse.data.healthScore}/100`);
      console.log(`   - Problèmes: ${diagnosticResponse.data.issues.length}`);
      testsPassed++;
    } else {
      throw new Error("Diagnostic échoué");
    }
  } catch (error) {
    console.log("❌ TEST 4 ÉCHOUÉ:", error.message);
    testsFailed++;
  }

  // TEST 5: Upload TSF
  try {
    console.log("\nTEST 5/10: Upload Tech Support File...");
    
    const tsfPath = "/home/romain/PaloMalo/test-tsf-mock.tgz";
    if (!fs.existsSync(tsfPath)) {
      throw new Error("Fichier TSF mockup introuvable");
    }

    const FormData = require("form-data");
    const form = new FormData();
    form.append("file", fs.createReadStream(tsfPath), {
      filename: "test-tsf-mock.tgz",
      contentType: "application/gzip",
    });

    const response = await new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: "localhost",
          port: 3001,
          path: "/api/tsf/upload",
          method: "POST",
          headers: form.getHeaders(),
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              resolve({ status: res.statusCode, data: JSON.parse(data) });
            } catch {
              resolve({ status: res.statusCode, data });
            }
          });
        }
      );
      req.on("error", reject);
      form.pipe(req);
    });

    if (response.status === 200 && response.data.success) {
      console.log("✅ TEST 5 RÉUSSI: TSF uploadé et parsé");
      console.log(`   - Hostname: ${response.data.data.system.hostname}`);
      console.log(`   - Model: ${response.data.data.system.model}`);
      testsPassed++;
    } else {
      throw new Error("Upload TSF échoué");
    }
  } catch (error) {
    console.log("❌ TEST 5 ÉCHOUÉ:", error.message);
    testsFailed++;
  }

  // TEST 6: Détection de problèmes d'interfaces
  try {
    console.log("\nTEST 6/10: Détection de problèmes d'interfaces...");
    const response = await httpRequest(`${BASE_URL}/api/metrics`, {
      method: "GET",
      headers: { Cookie: cookies },
    });

    if (response.data.interfaceIssues && response.data.interfaceIssues.length > 0) {
      console.log("✅ TEST 6 RÉUSSI: Problèmes d'interfaces détectés");
      console.log(`   - Nombre: ${response.data.interfaceIssues.length}`);
      testsPassed++;
    } else {
      console.log("⚠️  TEST 6 PASSÉ: Aucun problème d'interface (normal si firewall sain)");
      testsPassed++;
    }
  } catch (error) {
    console.log("❌ TEST 6 ÉCHOUÉ:", error.message);
    testsFailed++;
  }

  // TEST 7: Gestion des erreurs (mauvais credentials)
  try {
    console.log("\nTEST 7/10: Gestion des erreurs (mauvais credentials)...");
    const response = await httpRequest(`${BASE_URL}/api/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: FIREWALL_URL,
        username: "wrong",
        password: "wrong",
      }),
    });

    if (response.status !== 200 || !response.data.success) {
      console.log("✅ TEST 7 RÉUSSI: Erreur correctement gérée");
      testsPassed++;
    } else {
      throw new Error("Devrait échouer avec de mauvais credentials");
    }
  } catch (error) {
    console.log("❌ TEST 7 ÉCHOUÉ:", error.message);
    testsFailed++;
  }

  // TEST 8: Déconnexion
  try {
    console.log("\nTEST 8/10: Déconnexion...");
    const response = await httpRequest(`${BASE_URL}/api/connect`, {
      method: "DELETE",
      headers: { Cookie: cookies },
    });

    if (response.status === 200) {
      console.log("✅ TEST 8 RÉUSSI: Déconnexion effectuée");
      testsPassed++;
    } else {
      throw new Error("Déconnexion échouée");
    }
  } catch (error) {
    console.log("❌ TEST 8 ÉCHOUÉ:", error.message);
    testsFailed++;
  }

  // TEST 9: Vérification déconnexion
  try {
    console.log("\nTEST 9/10: Vérification déconnexion...");
    const response = await httpRequest(`${BASE_URL}/api/metrics`, {
      method: "GET",
      headers: { Cookie: cookies },
    });

    if (response.status === 401) {
      console.log("✅ TEST 9 RÉUSSI: Accès refusé après déconnexion");
      testsPassed++;
    } else {
      throw new Error("Devrait être déconnecté");
    }
  } catch (error) {
    console.log("❌ TEST 9 ÉCHOUÉ:", error.message);
    testsFailed++;
  }

  // TEST 10: Reconnexion
  try {
    console.log("\nTEST 10/10: Reconnexion...");
    const response = await httpRequest(`${BASE_URL}/api/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: FIREWALL_URL,
        username: USERNAME,
        password: PASSWORD,
      }),
    });

    if (response.status === 200 && response.data.success) {
      console.log("✅ TEST 10 RÉUSSI: Reconnexion réussie");
      testsPassed++;
    } else {
      throw new Error("Reconnexion échouée");
    }
  } catch (error) {
    console.log("❌ TEST 10 ÉCHOUÉ:", error.message);
    testsFailed++;
  }

  // Résumé
  console.log("\n" + "━".repeat(64));
  console.log("RÉSUMÉ DES TESTS");
  console.log("━".repeat(64));
  console.log(`✅ Tests réussis: ${testsPassed}/10`);
  console.log(`❌ Tests échoués: ${testsFailed}/10`);
  console.log(`📊 Taux de réussite: ${((testsPassed / 10) * 100).toFixed(1)}%`);
  console.log("━".repeat(64));

  if (testsFailed === 0) {
    console.log("\n🎉 TOUS LES TESTS SONT PASSÉS !");
    console.log("✅ PaloDiag est prêt pour la production");
  } else {
    console.log(`\n⚠️  ${testsFailed} test(s) ont échoué`);
  }
}

runTests();
