// Test du parser TSF avec un fichier mockup
const fs = require("fs");
const tar = require("tar-stream");
const zlib = require("zlib");

// Créer un TSF mockup pour tester
async function createMockTSF() {
  const pack = tar.pack();
  
  // Ajouter show_system_info.xml
  pack.entry(
    { name: "show_system_info.xml" },
    `<response status="success">
  <result>
    <system>
      <hostname>TEST-FW-01</hostname>
      <model>PA-5220</model>
      <serial>013201028945</serial>
      <sw-version>10.2.3</sw-version>
      <uptime>15 days, 3:45:12</uptime>
    </system>
  </result>
</response>`
  );
  
  // Ajouter show_system_resources
  pack.entry(
    { name: "show_system_resources.txt" },
    `top - 10:30:15 up 15 days,  3:45,  1 user,  load average: 0.45, 0.52, 0.48
Tasks: 245 total,   2 running, 243 sleeping,   0 stopped,   0 zombie
%Cpu(s):  8.5 us,  2.1 sy,  0.0 ni, 88.4 id,  0.5 wa,  0.3 hi,  0.2 si,  0.0 st
MiB Mem :  31836.3 total,    450.2 free,  12500.8 used,  18885.3 buff/cache
MiB Swap:   8192.0 total,   7890.5 free,    301.5 used.  18500.2 avail Mem

  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
 1234 root      20   0 2456780 345678  23456 S  45.2   1.1 123:45.67 pan_task
 5678 root      20   0 1234567 234567  12345 S  12.5   0.7  45:23.12 logd
 9012 root      20   0  987654 123456   8901 S   8.3   0.4  34:12.89 routed`
  );
  
  // Ajouter des logs
  pack.entry(
    { name: "ms.log" },
    `2026-04-06 10:25:12 ERROR: Interface ethernet1/1: CRC errors detected
2026-04-06 10:26:45 WARN: High CPU usage detected on dataplane
2026-04-06 10:27:30 ERROR: Session table 85% full
2026-04-06 10:28:15 CRITICAL: HA sync failed - peer unreachable`
  );
  
  // Ajouter HA status
  pack.entry(
    { name: "show_high-availability_all.xml" },
    `<response status="success">
  <result>
    <enabled>yes</enabled>
    <state>active</state>
    <peer-info>
      <mgmt-ip>192.168.1.2</mgmt-ip>
    </peer-info>
    <running-sync>synchronized</running-sync>
  </result>
</response>`
  );
  
  pack.finalize();
  
  // Compresser avec gzip
  const gzip = zlib.createGzip();
  const chunks = [];
  
  pack.pipe(gzip);
  
  return new Promise((resolve) => {
    gzip.on("data", (chunk) => chunks.push(chunk));
    gzip.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

async function testTSFParser() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║              🧪 TEST TSF PARSER 🧪                           ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  try {
    // 1. Créer un TSF mockup
    console.log("📦 Création d'un TSF mockup...");
    const tsfBuffer = await createMockTSF();
    console.log(`✅ TSF créé (${(tsfBuffer.length / 1024).toFixed(2)} KB)\n`);

    // 2. Sauvegarder le TSF
    const tsfPath = "/home/romain/PaloMalo/test-tsf-mock.tgz";
    fs.writeFileSync(tsfPath, tsfBuffer);
    console.log(`✅ TSF sauvegardé: ${tsfPath}\n`);

    // 3. Tester l'upload via API
    console.log("📡 Test de l'API /api/tsf/upload...");
    
    const FormData = require("form-data");
    const http = require("http");
    
    const form = new FormData();
    form.append("file", fs.createReadStream(tsfPath), {
      filename: "test-tsf-mock.tgz",
      contentType: "application/gzip",
    });

    const options = {
      hostname: "localhost",
      port: 3001,
      path: "/api/tsf/upload",
      method: "POST",
      headers: form.getHeaders(),
    };

    const response = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, data });
          }
        });
      });
      req.on("error", reject);
      form.pipe(req);
    });

    console.log(`Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log("✅ Upload réussi\n");
      
      const data = response.data.data;
      
      console.log("━".repeat(64));
      console.log("DONNÉES EXTRAITES");
      console.log("━".repeat(64));
      
      console.log("\n📊 SYSTÈME:");
      console.log(`   Hostname: ${data.system.hostname}`);
      console.log(`   Model: ${data.system.model}`);
      console.log(`   Serial: ${data.system.serial}`);
      console.log(`   Version: ${data.system.version}`);
      console.log(`   Uptime: ${data.system.uptime}`);
      
      console.log("\n🖥️  HARDWARE:");
      console.log(`   CPU: ${data.hardware.cpu}`);
      console.log(`   Memory: ${data.hardware.memory}`);
      console.log(`   Disk: ${data.hardware.disk}`);
      
      console.log("\n⚙️  PROCESSUS:");
      console.log(`   Nombre: ${data.processes.length}`);
      data.processes.slice(0, 3).forEach((proc) => {
        console.log(`   - ${proc.name} (CPU: ${proc.cpu}%, MEM: ${proc.memory}%)`);
      });
      
      console.log("\n📋 LOGS:");
      console.log(`   Critiques: ${data.logs.critical.length}`);
      console.log(`   Erreurs: ${data.logs.errors.length}`);
      console.log(`   Warnings: ${data.logs.warnings.length}`);
      
      if (data.ha) {
        console.log("\n🛡️  HA:");
        console.log(`   Enabled: ${data.ha.enabled}`);
        console.log(`   State: ${data.ha.state}`);
        if (data.ha.peer) console.log(`   Peer: ${data.ha.peer}`);
      }
      
      console.log("\n" + "━".repeat(64));
      console.log("✅ TEST RÉUSSI - TSF PARSER FONCTIONNEL");
      console.log("━".repeat(64));
    } else {
      console.log("❌ Upload échoué");
      console.log(response.data);
    }
  } catch (error) {
    console.error("\n❌ Erreur:", error.message);
    process.exit(1);
  }
}

testTSFParser();
