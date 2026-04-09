import { NextRequest, NextResponse } from "next/server";
import { generateApiKey, validateFirewallUrl } from "@/lib/panos";
import { ConnectRequest, ConnectResponse } from "@/types";

/**
 * API Route pour la connexion au firewall PAN-OS
 * POST /api/connect
 * Body: { url, username, password }
 * Retourne: { success: boolean, message?: string, error?: string }
 * Stocke la clé API dans un cookie HTTP-only sécurisé
 */
export async function POST(request: NextRequest) {
  try {
    // Parser le body de la requête
    const body: ConnectRequest = await request.json();
    const { url, username, password } = body;

    // Validation des champs
    if (!url || !username || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "Tous les champs sont requis",
        } as ConnectResponse,
        { status: 400 }
      );
    }

    // Validation du format de l'URL
    if (!validateFirewallUrl(url)) {
      return NextResponse.json(
        {
          success: false,
          error: "Format d'URL ou d'IP invalide",
        } as ConnectResponse,
        { status: 400 }
      );
    }

    // Génération de la clé API via PAN-OS
    let apiKey: string;
    try {
      apiKey = await generateApiKey(url, username, password);
    } catch (error) {
      // Erreurs spécifiques de connexion PAN-OS
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Erreur lors de la génération de la clé API",
        } as ConnectResponse,
        { status: 401 }
      );
    }

    // Créer la réponse avec le cookie HTTP-only
    const response = NextResponse.json(
      {
        success: true,
        message: "Connexion réussie",
      } as ConnectResponse,
      { status: 200 }
    );

    // Stocker la clé API dans un cookie sécurisé
    // Le cookie contient aussi l'URL du firewall pour les futures requêtes
    response.cookies.set("panos_api_key", apiKey, {
      httpOnly: true, // Pas accessible via JavaScript côté client
      secure: process.env.NODE_ENV === "production", // HTTPS uniquement en prod
      sameSite: "strict", // Protection CSRF
      maxAge: 60 * 60 * 24, // 24 heures
      path: "/",
    });

    response.cookies.set("panos_url", url, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Erreur dans /api/connect:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur lors de la connexion",
      } as ConnectResponse,
      { status: 500 }
    );
  }
}

/**
 * GET /api/connect
 * Vérifie si l'utilisateur est déjà connecté (cookie présent)
 */
export async function GET(request: NextRequest) {
  const apiKey = request.cookies.get("panos_api_key")?.value;
  const url = request.cookies.get("panos_url")?.value;

  if (apiKey && url) {
    return NextResponse.json({
      success: true,
      authenticated: true,
      message: "Session active",
    });
  }

  return NextResponse.json(
    {
      success: false,
      authenticated: false,
      error: "Aucune session active",
    },
    { status: 401 }
  );
}

/**
 * DELETE /api/connect
 * Déconnexion - supprime les cookies
 */
export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    message: "Déconnexion réussie",
  } as ConnectResponse);

  // Supprimer les cookies
  response.cookies.delete("panos_api_key");
  response.cookies.delete("panos_url");

  return response;
}
