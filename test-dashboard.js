// Test du dashboard Phase 2
const testDashboard = async () => {
  console.log("=".repeat(60));
  console.log("🧪 TEST DASHBOARD - PHASE 2");
  console.log("=".repeat(60));

  // Étape 1: Connexion
  console.log("\n📡 Étape 1: Connexion au firewall");
  try {
    const loginResponse = await fetch("http://localhost:3000/api/connect", {
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

    if (!loginResponse.ok) {
      throw new Error("Échec de la connexion");
    }

    console.log("✅ Connexion réussie");

    // Récupérer les cookies
    const setCookieHeader = loginResponse.headers.get("set-cookie");
    if (!setCookieHeader) {
      throw new Error("Pas de cookies reçus");
    }

    // Parser les cookies pour les renvoyer
    const cookieArray = setCookieHeader.split(", ");
    const apiKeyCookie = cookieArray.find((c) => c.startsWith("panos_api_key="));
    const urlCookie = cookieArray.find((c) => c.startsWith("panos_url="));

    if (!apiKeyCookie || !urlCookie) {
      throw new Error("Cookies manquants");
    }

    // Extraire les valeurs
    const apiKey = apiKeyCookie.split(";")[0];
    const url = urlCookie.split(";")[0];

    console.log("🍪 Cookies définis");

    // Étape 2: Récupérer les métriques
    console.log("\n📡 Étape 2: Récupération des métriques");
    const metricsResponse = await fetch("http://localhost:3000/api/metrics", {
      headers: {
        Cookie: `${apiKey}; ${url}`,
      },
    });

    if (!metricsResponse.ok) {
      const error = await metricsResponse.json();
      throw new Error(error.error || "Échec récupération métriques");
    }

    const metrics = await metricsResponse.json();
    console.log("✅ Métriques récupérées");

    // Afficher les métriques
    console.log("\n📊 MÉTRIQUES SYSTÈME");
    console.log("━".repeat(60));
    console.log(`CPU:     ${metrics.system.cpu}%`);
    console.log(`Memory:  ${metrics.system.memory}%`);
    console.log(`Disk:    ${metrics.system.disk}%`);
    console.log(`Uptime:  ${metrics.system.uptime}`);

    console.log("\n📊 SESSIONS");
    console.log("━".repeat(60));
    console.log(`Total:   ${metrics.sessions.total}`);
    console.log(`Active:  ${metrics.sessions.active}`);
    console.log(`TCP:     ${metrics.sessions.tcp}`);
    console.log(`UDP:     ${metrics.sessions.udp}`);
    console.log(`ICMP:    ${metrics.sessions.icmp}`);

    console.log("\n📊 INFORMATIONS SYSTÈME");
    console.log("━".repeat(60));
    console.log(`Hostname: ${metrics.info.hostname}`);
    console.log(`Model:    ${metrics.info.model}`);
    console.log(`Serial:   ${metrics.info.serial}`);
    console.log(`Version:  ${metrics.info.version}`);

    console.log("\n📊 INTERFACES");
    console.log("━".repeat(60));
    metrics.interfaces.forEach((iface) => {
      console.log(
        `${iface.name.padEnd(15)} | ${iface.status.padEnd(8)} | ${iface.speed.padEnd(10)} | RX: ${iface.rx} | TX: ${iface.tx}`
      );
    });

    console.log("\n" + "=".repeat(60));
    console.log("✅ TOUS LES TESTS SONT RÉUSSIS !");
    console.log("=".repeat(60));
    console.log("\n🎉 Phase 2 complète et fonctionnelle !");
    console.log("📋 Dashboard accessible sur http://localhost:3000/dashboard\n");
  } catch (error) {
    console.log("\n" + "=".repeat(60));
    console.log("❌ ÉCHEC DES TESTS");
    console.log("=".repeat(60));
    console.error(error);
    process.exit(1);
  }
};

testDashboard();
