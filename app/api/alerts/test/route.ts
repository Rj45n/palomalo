import { NextRequest, NextResponse } from "next/server";
import { testWebhook } from "@/lib/alert-engine";

export async function POST(request: NextRequest) {
  const apiKey = request.cookies.get("panos_api_key")?.value;
  const url    = request.cookies.get("panos_url")?.value;
  if (!apiKey || !url) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json() as { webhookUrl?: string };
  if (!body.webhookUrl) return NextResponse.json({ error: "webhookUrl requis" }, { status: 400 });

  const result = await testWebhook(body.webhookUrl);
  return NextResponse.json(result);
}
