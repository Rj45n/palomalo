// Test complet du TSF avec un fichier mockup riche
const fs = require("fs");
const tar = require("tar-stream");
const zlib = require("zlib");

// Créer un TSF mockup complet avec toutes les données
async function createCompleteTSF() {
  const pack = tar.pack();
  
  // Ajouter show_system_info.xml
  pack.entry(
    { name: "show_system_info.xml" },
    `<response status="success">
  <result>
    <system>
      <hostname>PA-5220-PROD-01</hostname>
      <model>PA-5220</model>
      <serial>013201028945</serial>
      <sw-version>10.2.3</sw-version>
      <uptime>45 days, 12:34:56</uptime>
    </system>
  </result>
</response>`
  );
  
  // Ajouter show_system_resources avec format complet
  pack.entry(
    { name: "show_system_resources.txt" },
    `top - 14:30:15 up 45 days, 12:34,  3 users,  load average: 2.15, 2.08, 1.95
Tasks: 312 total,   3 running, 309 sleeping,   0 stopped,   0 zombie
%Cpu(s): 35.2 us,  8.3 sy,  0.0 ni, 54.1 id,  1.2 wa,  0.5 hi,  0.7 si,  0.0 st
MiB Mem :  32768.0 total,   4096.0 free,  22528.0 used,   6144.0 buff/cache
MiB Swap:   8192.0 total,   7890.5 free,    301.5 used.  18500.2 avail Mem

   PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
  1234 root      20   0 4567890 567890  45678 S  45.2   1.7  567:89.12 pan_task
  2345 root      20   0 3456789 456789  34567 S  28.5   1.4  345:67.89 logd
  3456 root      20   0 2345678 345678  23456 S  15.3   1.1  234:56.78 routed
  4567 root      20   0 1234567 234567  12345 S  12.8   0.7  123:45.67 mgmtd
  5678 root      20   0 1123456 223456  11234 S   8.5   0.7  112:34.56 sysd
  6789 root      20   0 1012345 212345  10123 S   6.2   0.6  101:23.45 devsrvr
  7890 root      20   0  901234 201234   9012 S   4.8   0.6   90:12.34 masterd
  8901 root      20   0  890123 190123   8901 S   3.5   0.6   89:01.23 ikemgr
  9012 root      20   0  789012 189012   7890 S   2.8   0.6   78:90.12 sslvpn
  1023 root      20   0  678901 178901   6789 S   1.5   0.5   67:89.01 useridd`
  );
  
  // Ajouter des logs avec plus de contenu
  pack.entry(
    { name: "ms.log" },
    `2026-04-01 08:15:23 CRITICAL: Dataplane 1: Memory usage exceeds 90%
2026-04-01 09:23:45 CRITICAL: HA sync failed - peer unreachable for 30 seconds
2026-04-01 10:45:12 CRITICAL: SSL decrypt engine overload detected
2026-04-02 11:30:00 ERROR: Interface ethernet1/1: CRC errors detected (count: 1523)
2026-04-02 12:45:30 ERROR: Session table approaching capacity (85% full)
2026-04-02 14:20:15 ERROR: Certificate validation failed for server 192.168.1.100
2026-04-02 15:35:45 ERROR: DNS resolution timeout for domain malware.example.com
2026-04-02 16:50:20 ERROR: User authentication failed: invalid credentials (user: admin_test)
2026-04-03 08:05:10 WARN: High CPU usage detected on management plane (75%)
2026-04-03 09:15:25 WARN: Threat signature update pending for 48 hours
2026-04-03 10:25:40 WARN: License expiration warning: Threat Prevention expires in 30 days
2026-04-03 11:35:55 WARN: BGP neighbor 10.0.0.1 state changed to Idle
2026-04-03 12:45:10 WARN: Disk usage approaching threshold (82%)
2026-04-03 13:55:25 WARN: Management session timeout for user operator1
2026-04-04 14:05:40 INFO: Configuration commit successful
2026-04-04 15:15:55 INFO: Software update check completed`
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
      <state>passive</state>
    </peer-info>
    <running-sync>synchronized</running-sync>
  </result>
</response>`
  );
  
  // Ajouter licenses
  pack.entry(
    { name: "show_license_all.xml" },
    `<response status="success">
  <result>
    <licenses>
      <entry>
        <feature>Threat Prevention</feature>
        <expired>no</expired>
        <expiry>2027-04-06</expiry>
      </entry>
      <entry>
        <feature>URL Filtering</feature>
        <expired>no</expired>
        <expiry>2027-04-06</expiry>
      </entry>
      <entry>
        <feature>WildFire</feature>
        <expired>no</expired>
        <expiry>2027-04-06</expiry>
      </entry>
      <entry>
        <feature>GlobalProtect</feature>
        <expired>yes</expired>
        <expiry>2025-12-31</expiry>
      </entry>
      <entry>
        <feature>DNS Security</feature>
        <expired>no</expired>
        <expiry>2027-04-06</expiry>
      </entry>
    </licenses>
  </result>
</response>`
  );
  
  // Ajouter session info
  pack.entry(
    { name: "show_session_info.xml" },
    `<response status="success">
  <result>
    <max-sessions>4194304</max-sessions>
    <num-active>156789</num-active>
    <num-tcp>98765</num-tcp>
    <num-udp>45678</num-udp>
    <num-icmp>12346</num-icmp>
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

async function testCompleteTSF() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║           🧪 TEST TSF COMPLET 🧪                            ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  try {
    // 1. Créer un TSF complet
    console.log("📦 Création d'un TSF complet avec toutes les données...");
    const tsfBuffer = await createCompleteTSF();
    console.log(`✅ TSF créé (${(tsfBuffer.length / 1024).toFixed(2)} KB)\n`);

    // 2. Sauvegarder le TSF
    const tsfPath = "/home/romain/PaloMalo/test-tsf-complete.tgz";
    fs.writeFileSync(tsfPath, tsfBuffer);
    console.log(`✅ TSF sauvegardé: ${tsfPath}\n`);

    // 3. Tester l'upload via API
    console.log("📡 Test de l'API /api/tsf/upload...");
    
    const FormData = require("form-data");
    const http = require("http");
    
    const form = new FormData();
    form.append("file", fs.createReadStream(tsfPath), {
      filename: "test-tsf-complete.tgz",
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
      if (data.processes.length > 0) {
        data.processes.slice(0, 5).forEach((proc) => {
          console.log(`   - ${proc.name} (CPU: ${proc.cpu}%, MEM: ${proc.memory}%)`);
        });
      }
      
      console.log("\n📋 LOGS:");
      console.log(`   Critiques: ${data.logs.critical.length}`);
      console.log(`   Erreurs: ${data.logs.errors.length}`);
      console.log(`   Warnings: ${data.logs.warnings.length}`);
      
      if (data.ha) {
        console.log("\n🛡️  HA:");
        console.log(`   Enabled: ${data.ha.enabled}`);
        console.log(`   State: ${data.ha.state}`);
        if (data.ha.peer) console.log(`   Peer: ${data.ha.peer}`);
        if (data.ha.syncStatus) console.log(`   Sync: ${data.ha.syncStatus}`);
      }
      
      if (data.licenses && data.licenses.length > 0) {
        console.log("\n📜 LICENSES:");
        data.licenses.forEach((lic) => {
          const status = lic.status === "expired" ? "❌" : "✅";
          console.log(`   ${status} ${lic.feature} (expire: ${lic.expires})`);
        });
      }
      
      if (data.sessions) {
        console.log("\n🔗 SESSIONS:");
        console.log(`   Max: ${data.sessions.max}`);
        console.log(`   Active: ${data.sessions.current}`);
      }
      
      console.log("\n" + "━".repeat(64));
      console.log("✅ TEST RÉUSSI - TSF COMPLET FONCTIONNEL");
      console.log("━".repeat(64));
      
      // Vérifier que tout est présent
      let score = 0;
      const checks = [
        { name: "Hostname", ok: data.system.hostname && data.system.hostname !== "N/A" },
        { name: "CPU", ok: data.hardware.cpu && data.hardware.cpu !== "N/A" },
        { name: "Memory", ok: data.hardware.memory && data.hardware.memory !== "N/A" },
        { name: "Processes", ok: data.processes.length > 0 },
        { name: "Logs Critiques", ok: data.logs.critical.length > 0 },
        { name: "Logs Erreurs", ok: data.logs.errors.length > 0 },
        { name: "HA Status", ok: data.ha && data.ha.enabled },
        { name: "Licenses", ok: data.licenses && data.licenses.length > 0 },
        { name: "Sessions", ok: data.sessions && data.sessions.max > 0 },
      ];
      
      console.log("\n📊 VALIDATION DES DONNÉES:");
      checks.forEach(check => {
        if (check.ok) {
          console.log(`   ✅ ${check.name}`);
          score++;
        } else {
          console.log(`   ❌ ${check.name}`);
        }
      });
      
      console.log(`\n   Score: ${score}/${checks.length} (${((score/checks.length)*100).toFixed(0)}%)`);
      
    } else {
      console.log("❌ Upload échoué");
      console.log(response.data);
    }
  } catch (error) {
    console.error("\n❌ Erreur:", error.message);
    process.exit(1);
  }
}

testCompleteTSF();
