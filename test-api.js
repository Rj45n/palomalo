// Test rapide de l'API de connexion
// Usage: node test-api.js

const testConnection = async () => {
  const data = {
    url: "172.18.111.201",
    username: "Codex",
    password: "C0d3x!34970",
  };

  console.log("🧪 Test de connexion à l'API...");
  console.log("📝 Données:", data);

  try {
    const response = await fetch("http://localhost:3000/api/connect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    console.log("📥 Status:", response.status);
    
    const result = await response.json();
    console.log("📦 Réponse:", result);

    if (response.ok) {
      console.log("✅ Test réussi !");
    } else {
      console.log("❌ Test échoué:", result.error);
    }
  } catch (error) {
    console.error("❌ Erreur:", error.message);
  }
};

testConnection();
