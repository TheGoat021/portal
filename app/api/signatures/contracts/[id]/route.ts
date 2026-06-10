import { NextRequest, NextResponse } from "next/server";

import { getSignatureDocumentById, updateSignatureDocument } from "@/lib/signatures";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const document = await getSignatureDocumentById(id);

    if (!document) {
      return NextResponse.json({ error: "Contrato nao encontrado." }, { status: 404 });
    }

    return NextResponse.json(document);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao consultar contrato." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const document = await updateSignatureDocument({
      documentId: id,
      title: typeof body.title === "string" ? body.title.trim() : undefined,
    });

    return NextResponse.json(document);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao atualizar contrato." },
      { status: 500 }
    );
  }
}
