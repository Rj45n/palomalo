/**
 * Test du parsing HA avec différentes structures XML
 * Pour identifier pourquoi le peer est détecté comme "down"
 */

// Simuler différentes réponses XML PAN-OS

const testCases = [
  {
    name: "HA Actif-Passif (normal)",
    xml: {
      response: {
        status: "success",
        result: {
          enabled: "yes",
          group: {
            mode: "Active-Passive",
            "local-info": {
              state: "active",
              "mgmt-ip": "10.0.0.1",
            },
            "peer-info": {
              state: "passive",
              "mgmt-ip": "10.0.0.2",
              "conn-status": "up",
            },
            "running-sync": "synchronized",
          },
        },
      },
    },
    expectedPeerState: "passive",
    expectedSyncStatus: "synchronized",
  },
  {
    name: "HA avec group wrapper",
    xml: {
      response: {
        status: "success",
        result: {
          enabled: "yes",
          "local-info": {
            state: "active",
          },
          "peer-info": {
            state: "passive",
            "conn-ha1": {
              status: "up",
            },
          },
          "running-sync": "synchronized",
        },
      },
    },
    expectedPeerState: "passive",
    expectedSyncStatus: "synchronized",
  },
  {
    name: "HA Peer Down",
    xml: {
      response: {
        status: "success",
        result: {
          enabled: "yes",
          "local-info": {
            state: "active",
          },
          "peer-info": {
            state: "non-functional",
            "conn-status": "down",
          },
          "running-sync": "not-synchronized",
        },
      },
    },
    expectedPeerState: "disconnected",
    expectedSyncStatus: "not-synchronized",
  },
  {
    name: "HA sans peer-info (parsing incomplet)",
    xml: {
      response: {
        status: "success",
        result: {
          enabled: "yes",
          "local-info": {
            state: "active",
          },
        },
      },
    },
    expectedPeerState: "unknown",
    expectedSyncStatus: "unknown",
  },
];

// Fonction de parsing simplifiée pour le test
function parseHAStatus(xmlData) {
  const result = {
    enabled: false,
    localState: "disabled",
    peerState: "unknown",
    syncStatus: "unknown",
  };

  try {
    const ha = xmlData?.response?.result;
    if (!ha) {
      console.log("⚠️ HA: Pas de données dans response.result");
      return result;
    }

    result.enabled = ha.enabled === "yes" || ha.enabled === true;
    console.log(`📊 HA enabled: ${result.enabled}`);
    
    if (result.enabled) {
      const localInfo = ha["local-info"] || ha.group?.["local-info"];
      const peerInfo = ha["peer-info"] || ha.group?.["peer-info"];

      if (localInfo) {
        result.localState = localInfo.state || "unknown";
        console.log(`   Local state: ${result.localState}`);
      }

      if (peerInfo) {
        const peerState = peerInfo.state || peerInfo["ha-state"] || peerInfo.status;
        
        if (peerState) {
          result.peerState = peerState.toLowerCase();
        } else {
          result.peerState = "connected";
        }
        
        const conn = peerInfo.conn || peerInfo["conn-status"] || peerInfo["conn-ha1"];
        if (conn) {
          const connStatus = typeof conn === "string" ? conn : conn.status || conn.state;
          console.log(`   Peer conn-status: ${connStatus}`);
          if (connStatus && connStatus.toLowerCase().includes("down")) {
            result.peerState = "disconnected";
          }
        }
        
        console.log(`   Peer state: ${result.peerState}`);
      } else {
        console.log("⚠️ HA: Pas de peer-info trouvé");
      }

      const sync = ha["running-sync"] || ha["running-sync-enabled"] || ha["sync-status"] || ha.group?.["running-sync"];
      if (sync) {
        result.syncStatus = sync.toLowerCase();
        console.log(`   Sync status: ${result.syncStatus}`);
      }
    }
  } catch (error) {
    console.error("❌ Erreur parsing HA status:", error);
  }

  return result;
}

// Exécuter les tests
console.log("🧪 Tests de parsing HA\n");

testCases.forEach((testCase, index) => {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log("=".repeat(60));
  
  const result = parseHAStatus(testCase.xml);
  
  console.log("\n📋 Résultat:");
  console.log(`   Enabled: ${result.enabled}`);
  console.log(`   Local State: ${result.localState}`);
  console.log(`   Peer State: ${result.peerState}`);
  console.log(`   Sync Status: ${result.syncStatus}`);
  
  console.log("\n✅ Attendu:");
  console.log(`   Peer State: ${testCase.expectedPeerState}`);
  console.log(`   Sync Status: ${testCase.expectedSyncStatus}`);
  
  const peerMatch = result.peerState === testCase.expectedPeerState;
  const syncMatch = result.syncStatus === testCase.expectedSyncStatus;
  
  console.log("\n🎯 Validation:");
  console.log(`   Peer State: ${peerMatch ? "✅ OK" : "❌ FAIL"}`);
  console.log(`   Sync Status: ${syncMatch ? "✅ OK" : "❌ FAIL"}`);
});

console.log("\n" + "=".repeat(60));
console.log("🏁 Tests terminés");
console.log("=".repeat(60));

console.log("\n💡 Pour tester avec ton firewall:");
console.log("   1. Lance l'app: npm run dev");
console.log("   2. Connecte-toi au firewall");
console.log("   3. Va dans Diagnostics");
console.log("   4. Regarde les logs console pour voir le parsing HA");
