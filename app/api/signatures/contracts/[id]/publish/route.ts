import { NextResponse } from "next/server";

import { publishSignatureDocument } from "@/lib/signatures";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const document = await publishSignatureDocument(id);
    return NextResponse.json(document);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao publicar contrato." },
      { status: 500 }
    );
  }
}
