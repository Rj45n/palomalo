// Test final complet - Phases 1 & 2
console.log("╔══════════════════════════════════════════════════════════════╗");
console.log("║                                                              ║");
console.log("║           🧪 TEST FINAL COMPLET - PHASES 1 & 2 🧪            ║");
console.log("║                                                              ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");

const tests = {
  passed: 0,
  failed: 0,
  total: 0
};

async function runTest(name, fn) {
  tests.total++;
  process.stdout.write(`\n📋 Test ${tests.total}: ${name}... `);
  try {
    await fn();
    tests.passed++;
    console.log("✅ SUCCÈS");
    return true;
  } catch (error) {
    tests.failed++;
    console.log("❌ ÉCHEC");
    console.error(`   Erreur: ${error.message}`);
    return false;
  }
}

async function testComplete() {
  console.log("━".repeat(64));
  console.log("PHASE 1 - CONNEXION");
  console.log("━".repeat(64));

  let cookies = null;

  // Test 1: Connexion au firewall
  await runTest("Connexion au firewall PAN-OS", async () => {
    const response = await fetch("http://localhost:3000/api/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: "172.18.111.201",
        username: "Codex",
        password: "C0d3x!34970",
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Connexion échouée");
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error("Réponse de connexion invalide");
    }

    // Récupérer les cookies
    const setCookieHeader = response.headers.get("set-cookie");
    if (!setCookieHeader) {
      throw new Error("Pas de cookies définis");
    }

    cookies = setCookieHeader;
  });

  // Test 2: Vérification des cookies
  await runTest("Vérification des cookies HTTP-only", async () => {
    if (!cookies) throw new Error("Cookies non définis");
    
    if (!cookies.includes("panos_api_key=")) {
      throw new Error("Cookie panos_api_key manquant");
    }
    if (!cookies.includes("panos_url=")) {
      throw new Error("Cookie panos_url manquant");
    }
    if (!cookies.includes("HttpOnly")) {
      throw new Error("Cookies non HTTP-only");
    }
    if (!cookies.includes("SameSite=strict")) {
      throw new Error("Protection CSRF manquante");
    }
  });

  // Test 3: Vérification de session
  await runTest("Vérification de session active", async () => {
    const cookieArray = cookies.split(", ");
    const apiKey = cookieArray.find(c => c.startsWith("panos_api_key=")).split(";")[0];
    const url = cookieArray.find(c => c.startsWith("panos_url=")).split(";")[0];

    const response = await fetch("http://localhost:3000/api/connect", {
      method: "GET",
      headers: { Cookie: `${apiKey}; ${url}` },
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error("Session non reconnue");
    }
  });

  console.log("\n" + "━".repeat(64));
  console.log("PHASE 2 - DASHBOARD");
  console.log("━".repeat(64));

  // Test 4: API Métriques (mock)
  await runTest("Récupération métriques (mock)", async () => {
    const cookieArray = cookies.split(", ");
    const apiKey = cookieArray.find(c => c.startsWith("panos_api_key=")).split(";")[0];
    const url = cookieArray.find(c => c.startsWith("panos_url=")).split(";")[0];

    const response = await fetch("http://localhost:3000/api/metrics-mock", {
      headers: { Cookie: `${apiKey}; ${url}` },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const metrics = await response.json();
    
    // Vérifier la structure
    if (!metrics.system || !metrics.sessions || !metrics.interfaces || !metrics.info) {
      throw new Error("Structure de métriques invalide");
    }

    // Vérifier les valeurs
    if (typeof metrics.system.cpu !== "number") {
      throw new Error("CPU invalide");
    }
    if (typeof metrics.sessions.total !== "number") {
      throw new Error("Sessions invalides");
    }
    if (!Array.isArray(metrics.interfaces)) {
      throw new Error("Interfaces invalides");
    }
  });

  // Test 5: Page HTML principale
  await runTest("Page de connexion accessible", async () => {
    const response = await fetch("http://localhost:3000");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    if (!html.includes("PaloMalo")) {
      throw new Error("Contenu de page invalide");
    }
    if (!html.includes("Connexion au Firewall")) {
      throw new Error("Formulaire de connexion manquant");
    }
  });

  // Test 6: Déconnexion
  await runTest("Déconnexion et suppression cookies", async () => {
    const cookieArray = cookies.split(", ");
    const apiKey = cookieArray.find(c => c.startsWith("panos_api_key=")).split(";")[0];
    const url = cookieArray.find(c => c.startsWith("panos_url=")).split(";")[0];

    const response = await fetch("http://localhost:3000/api/connect", {
      method: "DELETE",
      headers: { Cookie: `${apiKey}; ${url}` },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error("Déconnexion échouée");
    }
  });

  console.log("\n" + "━".repeat(64));
  console.log("TESTS ADDITIONNELS");
  console.log("━".repeat(64));

  // Test 7: Gestion d'erreur - Mauvais credentials
  await runTest("Gestion erreur - Credentials invalides", async () => {
    const response = await fetch("http://localhost:3000/api/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: "172.18.111.201",
        username: "wrong",
        password: "wrong",
      }),
    });

    if (response.ok) {
      throw new Error("Devrait échouer avec mauvais credentials");
    }

    const data = await response.json();
    if (!data.error) {
      throw new Error("Message d'erreur manquant");
    }
  });

  // Test 8: Protection session - Sans cookies
  await runTest("Protection session - Accès sans cookies", async () => {
    const response = await fetch("http://localhost:3000/api/metrics-mock");
    
    if (response.ok) {
      throw new Error("Devrait refuser l'accès sans cookies");
    }

    if (response.status !== 401) {
      throw new Error(`Status attendu: 401, reçu: ${response.status}`);
    }
  });

  // Résumé final
  console.log("\n" + "═".repeat(64));
  console.log("RÉSUMÉ FINAL");
  console.log("═".repeat(64));
  console.log(`\nTests totaux:     ${tests.total}`);
  console.log(`Tests réussis:    ${tests.passed} ✅`);
  console.log(`Tests échoués:    ${tests.failed} ❌`);
  console.log(`Taux de réussite: ${Math.round((tests.passed / tests.total) * 100)}%`);

  if (tests.failed === 0) {
    console.log("\n" + "═".repeat(64));
    console.log("🎉 TOUS LES TESTS SONT RÉUSSIS ! 🎉");
    console.log("═".repeat(64));
    console.log("\n✅ Le projet PaloMalo est validé et prêt pour la Phase 3 !");
    console.log("\nFonctionnalités validées:");
    console.log("  ✅ Connexion sécurisée au firewall");
    console.log("  ✅ Gestion des sessions (cookies HTTP-only)");
    console.log("  ✅ API métriques fonctionnelle");
    console.log("  ✅ Protection CSRF");
    console.log("  ✅ Gestion d'erreurs");
    console.log("  ✅ Déconnexion");
    console.log("\n🚀 Prêt pour la Phase 3: Tech Support Files\n");
  } else {
    console.log("\n" + "═".repeat(64));
    console.log("⚠️  CERTAINS TESTS ONT ÉCHOUÉ");
    console.log("═".repeat(64));
    console.log("\nVeuillez corriger les erreurs avant de continuer.\n");
    process.exit(1);
  }
}

testComplete().catch(error => {
  console.error("\n❌ Erreur fatale:", error);
  process.exit(1);
});
