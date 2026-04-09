import { NextRequest, NextResponse } from "next/server";
import { getAllRecords, getRecord, deleteRecord } from "@/lib/diagnostic-history";

export async function GET(request: NextRequest) {
  const apiKey = request.cookies.get("panos_api_key")?.value;
  const url    = request.cookies.get("panos_url")?.value;
  if (!apiKey || !url) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (id) {
    const record = await getRecord(id);
    if (!record) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    return NextResponse.json(record);
  }

  const page  = Math.max(1, parseInt(request.nextUrl.searchParams.get("page")  ?? "1",  10));
  const limit = Math.min(50, parseInt(request.nextUrl.searchParams.get("limit") ?? "20", 10));
  const all   = await getAllRecords();
  const start = (page - 1) * limit;

  return NextResponse.json({
    total:   all.length,
    page,
    limit,
    records: all.slice(start, start + limit),
  });
}

export async function DELETE(request: NextRequest) {
  const apiKey = request.cookies.get("panos_api_key")?.value;
  const url    = request.cookies.get("panos_url")?.value;
  if (!apiKey || !url) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const ok = await deleteRecord(id);
  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Introuvable" }, { status: 404 });
}
