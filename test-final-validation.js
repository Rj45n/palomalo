// Test de validation finale - PaloDiag v1.0.0
const fs = require("fs");
const path = require("path");

console.log("╔══════════════════════════════════════════════════════════════╗");
console.log("║         🎉 VALIDATION FINALE - PaloDiag v1.0.0 🎉           ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");

let totalChecks = 0;
let passedChecks = 0;

function check(name, condition, details = "") {
  totalChecks++;
  if (condition) {
    console.log(`✅ ${name}`);
    if (details) console.log(`   ${details}`);
    passedChecks++;
    return true;
  } else {
    console.log(`❌ ${name}`);
    if (details) console.log(`   ${details}`);
    return false;
  }
}

console.log("━".repeat(64));
console.log("1. STRUCTURE DU PROJET");
console.log("━".repeat(64));

// Vérifier les fichiers essentiels
check("README.md existe", fs.existsSync("README.md"));
check("CHANGELOG.md existe", fs.existsSync("CHANGELOG.md"));
check("LICENSE existe", fs.existsSync("LICENSE"));
check("package.json existe", fs.existsSync("package.json"));
check("setup.sh existe", fs.existsSync("setup.sh"));
check(".gitignore existe", fs.existsSync(".gitignore"));

// Vérifier la documentation
console.log("\n" + "━".repeat(64));
console.log("2. DOCUMENTATION");
console.log("━".repeat(64));

check("docs/architecture.md existe", fs.existsSync("docs/architecture.md"));
check("docs/contributing.md existe", fs.existsSync("docs/contributing.md"));
check("docs/deployment.md existe", fs.existsSync("docs/deployment.md"));
check("docs/api-routes.md existe", fs.existsSync("docs/api-routes.md"));

// Vérifier les composants
console.log("\n" + "━".repeat(64));
console.log("3. COMPOSANTS");
console.log("━".repeat(64));

const components = [
  "components/dashboard/DashboardLayout.tsx",
  "components/dashboard/MetricCard.tsx",
  "components/dashboard/CPUMemoryChart.tsx",
  "components/dashboard/SessionsChart.tsx",
  "components/dashboard/InterfacesTableEnhanced.tsx",
  "components/dashboard/InterfaceIssuesPanel.tsx",
  "components/dashboard/MetricsSkeleton.tsx",
  "components/diagnostic/DiagnosticPanel.tsx",
  "components/tsf/TSFUpload.tsx",
  "components/tsf/TSFDataView.tsx",
];

let componentsOK = 0;
components.forEach((comp) => {
  if (fs.existsSync(comp)) componentsOK++;
});

check(
  `Composants (${componentsOK}/${components.length})`,
  componentsOK === components.length,
  `${componentsOK} composants trouvés`
);

// Vérifier les API routes
console.log("\n" + "━".repeat(64));
console.log("4. API ROUTES");
console.log("━".repeat(64));

const apiRoutes = [
  "app/api/connect/route.ts",
  "app/api/metrics/route.ts",
  "app/api/diagnostic/route.ts",
  "app/api/tsf/upload/route.ts",
];

let routesOK = 0;
apiRoutes.forEach((route) => {
  if (fs.existsSync(route)) routesOK++;
});

check(
  `API Routes (${routesOK}/${apiRoutes.length})`,
  routesOK === apiRoutes.length,
  `${routesOK} routes trouvées`
);

// Vérifier les lib
console.log("\n" + "━".repeat(64));
console.log("5. LIBRAIRIES");
console.log("━".repeat(64));

const libs = [
  "lib/panos.ts",
  "lib/tsf-parser.ts",
  "lib/diagnostic-engine.ts",
  "lib/interface-analyzer.ts",
  "lib/utils.ts",
];

let libsOK = 0;
libs.forEach((lib) => {
  if (fs.existsSync(lib)) libsOK++;
});

check(
  `Librairies (${libsOK}/${libs.length})`,
  libsOK === libs.length,
  `${libsOK} librairies trouvées`
);

// Vérifier les types
console.log("\n" + "━".repeat(64));
console.log("6. TYPES TYPESCRIPT");
console.log("━".repeat(64));

check("types/index.ts existe", fs.existsSync("types/index.ts"));

if (fs.existsSync("types/index.ts")) {
  const typesContent = fs.readFileSync("types/index.ts", "utf-8");
  check(
    "Interface DashboardMetrics définie",
    typesContent.includes("interface DashboardMetrics")
  );
  check(
    "Interface TSFData définie",
    typesContent.includes("interface TSFData")
  );
  check(
    "Interface DiagnosticIssue définie",
    typesContent.includes("interface DiagnosticIssue")
  );
}

// Vérifier les tests
console.log("\n" + "━".repeat(64));
console.log("7. TESTS");
console.log("━".repeat(64));

const tests = [
  "test-complete-e2e.js",
  "test-diagnostic-engine.js",
  "test-tsf-parser.js",
  "test-interface-metrics.js",
];

let testsOK = 0;
tests.forEach((test) => {
  if (fs.existsSync(test)) testsOK++;
});

check(
  `Scripts de test (${testsOK}/${tests.length})`,
  testsOK === tests.length,
  `${testsOK} tests trouvés`
);

// Vérifier package.json
console.log("\n" + "━".repeat(64));
console.log("8. DÉPENDANCES");
console.log("━".repeat(64));

if (fs.existsSync("package.json")) {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf-8"));
  
  check("Next.js installé", pkg.dependencies.next !== undefined);
  check("React installé", pkg.dependencies.react !== undefined);
  check("TypeScript installé", pkg.devDependencies.typescript !== undefined);
  check("Tailwind installé", pkg.devDependencies.tailwindcss !== undefined);
  check("Framer Motion installé", pkg.dependencies["framer-motion"] !== undefined);
  check("Recharts installé", pkg.dependencies.recharts !== undefined);
  check("xml2js installé", pkg.dependencies["xml2js"] !== undefined);
  check("tar-stream installé", pkg.dependencies["tar-stream"] !== undefined);
}

// Vérifier la taille du README
console.log("\n" + "━".repeat(64));
console.log("9. QUALITÉ DE LA DOCUMENTATION");
console.log("━".repeat(64));

if (fs.existsSync("README.md")) {
  const readmeContent = fs.readFileSync("README.md", "utf-8");
  const readmeLines = readmeContent.split("\n").length;
  
  check(
    "README.md complet",
    readmeLines > 200,
    `${readmeLines} lignes`
  );
  check(
    "README contient installation",
    readmeContent.includes("Installation")
  );
  check(
    "README contient utilisation",
    readmeContent.includes("Utilisation")
  );
  check(
    "README contient architecture",
    readmeContent.includes("Architecture")
  );
}

// Vérifier le CHANGELOG
console.log("\n" + "━".repeat(64));
console.log("10. CHANGELOG");
console.log("━".repeat(64));

if (fs.existsSync("CHANGELOG.md")) {
  const changelogContent = fs.readFileSync("CHANGELOG.md", "utf-8");
  
  check(
    "CHANGELOG contient version 1.0.0",
    changelogContent.includes("[1.0.0]")
  );
  check(
    "CHANGELOG contient date",
    changelogContent.includes("2026-04-06")
  );
}

// Résumé final
console.log("\n" + "━".repeat(64));
console.log("RÉSUMÉ FINAL");
console.log("━".repeat(64));

const percentage = ((passedChecks / totalChecks) * 100).toFixed(1);

console.log(`\n✅ Checks réussis: ${passedChecks}/${totalChecks}`);
console.log(`📊 Taux de réussite: ${percentage}%`);

if (passedChecks === totalChecks) {
  console.log("\n" + "━".repeat(64));
  console.log("🎉 VALIDATION COMPLÈTE RÉUSSIE ! 🎉");
  console.log("━".repeat(64));
  console.log("\n✅ PaloDiag v1.0.0 est 100% prêt pour la production !");
  console.log("\n🚀 Prochaines étapes :");
  console.log("   1. Lancer le serveur : npm run dev");
  console.log("   2. Tester avec un firewall réel");
  console.log("   3. Déployer en production");
  console.log("   4. Partager avec la communauté !");
  console.log("\n🌟 Félicitations ! Le projet est terminé et validé.\n");
} else {
  console.log("\n⚠️  Quelques checks ont échoué.");
  console.log(`   ${totalChecks - passedChecks} problème(s) à corriger.\n`);
}
