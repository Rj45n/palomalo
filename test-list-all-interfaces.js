// Liste toutes les interfaces pour comprendre la structure
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

async function listAllInterfaces() {
  console.log("📋 Liste de toutes les interfaces\n");

  try {
    // Connexion
    const connectResponse = await httpRequest(`${BASE_URL}/api/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: FIREWALL_URL,
        username: USERNAME,
        password: PASSWORD,
      }),
    });

    const setCookie = connectResponse.headers["set-cookie"];
    const cookies = setCookie ? setCookie.join("; ") : "";

    // Récupérer les métriques
    const metricsResponse = await httpRequest(`${BASE_URL}/api/metrics`, {
      method: "GET",
      headers: { Cookie: cookies },
    });

    const metrics = metricsResponse.data;

    console.log(`Total: ${metrics.interfaces.length} interfaces\n`);

    // Grouper par type
    const ethernet = [];
    const ae = [];
    const aeWithDot = [];
    const other = [];

    metrics.interfaces.forEach((iface) => {
      if (iface.name.startsWith("ethernet")) {
        ethernet.push(iface.name);
      } else if (iface.name.match(/^ae\d+\./)) {
        aeWithDot.push(iface.name);
      } else if (iface.name.startsWith("ae")) {
        ae.push(iface.name);
      } else {
        other.push(iface.name);
      }
    });

    console.log(`━`.repeat(64));
    console.log(`INTERFACES ETHERNET (${ethernet.length})`);
    console.log(`━`.repeat(64));
    ethernet.slice(0, 10).forEach((name) => console.log(`  ${name}`));
    if (ethernet.length > 10) {
      console.log(`  ... et ${ethernet.length - 10} autres`);
    }

    console.log(`\n━`.repeat(64));
    console.log(`INTERFACES AE (${ae.length})`);
    console.log(`━`.repeat(64));
    ae.forEach((name) => console.log(`  ${name}`));

    console.log(`\n━`.repeat(64));
    console.log(`SOUS-INTERFACES AE (${aeWithDot.length})`);
    console.log(`━`.repeat(64));
    aeWithDot.slice(0, 20).forEach((name) => console.log(`  ${name}`));
    if (aeWithDot.length > 20) {
      console.log(`  ... et ${aeWithDot.length - 20} autres`);
    }

    console.log(`\n━`.repeat(64));
    console.log(`AUTRES (${other.length})`);
    console.log(`━`.repeat(64));
    other.forEach((name) => console.log(`  ${name}`));
  } catch (error) {
    console.error("❌ Erreur:", error.message);
  }
}

listAllInterfaces();
