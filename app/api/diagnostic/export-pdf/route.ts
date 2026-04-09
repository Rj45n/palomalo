import { NextRequest, NextResponse } from "next/server";
import { getRecord } from "@/lib/diagnostic-history";
import { generateDiagnosticPDF } from "@/lib/pdf-generator";

export async function GET(request: NextRequest) {
  const apiKey = request.cookies.get("panos_api_key")?.value;
  const url    = request.cookies.get("panos_url")?.value;
  if (!apiKey || !url) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const record = await getRecord(id);
  if (!record) return NextResponse.json({ error: "Diagnostic introuvable" }, { status: 404 });

  const pdfBuffer = await generateDiagnosticPDF(record);
  const filename  = `diagnostic-${record.hostname}-${record.timestamp.slice(0, 10)}.pdf`;

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length":      pdfBuffer.length.toString(),
    },
  });
}
