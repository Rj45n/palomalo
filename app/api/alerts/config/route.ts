import { NextRequest, NextResponse } from "next/server";
import { getAlertConfig, saveAlertConfig } from "@/lib/alert-config";
import { AlertConfig } from "@/types";

export async function GET(request: NextRequest) {
  const apiKey = request.cookies.get("panos_api_key")?.value;
  const url    = request.cookies.get("panos_url")?.value;
  if (!apiKey || !url) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const config = await getAlertConfig();
  // Masquer le mot de passe SMTP côté client
  const safe: AlertConfig = { ...config, smtpPass: config.smtpPass ? "••••••" : undefined };
  return NextResponse.json(safe);
}

export async function POST(request: NextRequest) {
  const apiKey = request.cookies.get("panos_api_key")?.value;
  const url    = request.cookies.get("panos_url")?.value;
  if (!apiKey || !url) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json() as Partial<AlertConfig>;
  const current = await getAlertConfig();

  // Conserver l'ancien mot de passe si le client renvoie le masque
  if (body.smtpPass === "••••••") body.smtpPass = current.smtpPass;

  const updated: AlertConfig = { ...current, ...body };
  await saveAlertConfig(updated);
  return NextResponse.json({ ok: true });
}
