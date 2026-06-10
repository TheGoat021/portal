import { NextRequest, NextResponse } from "next/server";

import { createSignatureDocument, listSignatureDocuments } from "@/lib/signatures";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get("status");
    const search = request.nextUrl.searchParams.get("search");
    const data = await listSignatureDocuments({ status, search });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao listar contratos." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file") as File | null;
    const title = String(form.get("title") || "").trim();

    if (!file) {
      return NextResponse.json({ error: "file e obrigatorio." }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: "title e obrigatorio." }, { status: 400 });
    }

    if ((file.type || "").toLowerCase() !== "application/pdf") {
      return NextResponse.json({ error: "Somente arquivos PDF sao aceitos." }, { status: 400 });
    }

    const document = await createSignatureDocument({
      title,
      fileBuffer: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type || "application/pdf",
      fileName: file.name || `${title}.pdf`,
      createdByUserId: String(form.get("createdByUserId") || "").trim() || null,
      externalReference: String(form.get("externalReference") || "").trim() || null,
      integrationSource: String(form.get("integrationSource") || "").trim() || null,
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao criar contrato." },
      { status: 500 }
    );
  }
}
