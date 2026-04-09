// Test pour comprendre la structure des AE
const https = require("https");
const { parseStringPromise } = require("xml2js");

const FIREWALL_URL = "172.18.111.201";
const USERNAME = "Codex";
const PASSWORD = "C0d3x!34970";

function httpsRequest(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { rejectUnauthorized: false }, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve({ status: res.statusCode, data }));
      })
      .on("error", reject);
  });
}

async function testAEStructure() {
  console.log("🧪 Test structure AE\n");

  try {
    // Obtenir la clé API
    const keygenUrl = `https://${FIREWALL_URL}/api/?type=keygen&user=${encodeURIComponent(
      USERNAME
    )}&password=${encodeURIComponent(PASSWORD)}`;
    const keygenResponse = await httpsRequest(keygenUrl);
    const keyMatch = keygenResponse.data.match(/<key>([^<]+)<\/key>/);
    const apiKey = keyMatch[1];
    console.log("✅ Clé API obtenue\n");

    // Récupérer la config AE
    const aeXpath = "/config/devices/entry[@name='localhost.localdomain']/network/interface/aggregate-ethernet";
    const aeUrl = `https://${FIREWALL_URL}/api/?type=config&action=show&xpath=${encodeURIComponent(
      aeXpath
    )}&key=${apiKey}`;
    const aeResponse = await httpsRequest(aeUrl);

    // Parser le XML
    const parsed = await parseStringPromise(aeResponse.data, {
      explicitArray: false,
      mergeAttrs: true,
      trim: true,
      normalize: true,
    });

    const aeEntries = parsed.response.result?.["aggregate-ethernet"]?.entry;
    const aeArray = Array.isArray(aeEntries) ? aeEntries : [aeEntries];

    console.log(`📊 Nombre d'interfaces AE : ${aeArray.length}\n`);

    // Analyser chaque AE
    for (const ae of aeArray.slice(0, 3)) {
      const aeName = ae.name || ae["$"]?.name || "unknown";
      const comment = ae.comment || "";

      console.log(`━`.repeat(64));
      console.log(`Interface: ${aeName}`);
      console.log(`Comment: ${comment}`);
      console.log(`━`.repeat(64));

      // Vérifier layer3
      const layer3 = ae.layer3;
      if (layer3) {
        console.log("✅ layer3 présent");

        if (layer3.units) {
          console.log("✅ layer3.units présent");

          if (layer3.units.entry) {
            const unitArray = Array.isArray(layer3.units.entry)
              ? layer3.units.entry
              : [layer3.units.entry];

            console.log(`✅ Nombre de units : ${unitArray.length}`);

            unitArray.slice(0, 3).forEach((unit, idx) => {
              console.log(`\n   Unit ${idx + 1}:`);
              console.log(`      name: ${unit.name || unit["$"]?.name || "N/A"}`);
              console.log(`      tag: ${unit.tag || "N/A"}`);
              console.log(`      Clés: ${Object.keys(unit).join(", ")}`);
            });
          } else {
            console.log("❌ layer3.units.entry absent");
          }
        } else {
          console.log("❌ layer3.units absent");
        }
      } else {
        console.log("❌ layer3 absent");
      }

      console.log("");
    }
  } catch (error) {
    console.error("❌ Erreur:", error.message);
  }
}

testAEStructure();
