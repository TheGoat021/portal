import { NextResponse } from "next/server";

import { getPublicSignatureDocumentByToken } from "@/lib/signatures";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const document = await getPublicSignatureDocumentByToken(token);

    if (!document) {
      return NextResponse.json({ error: "Link nao encontrado." }, { status: 404 });
    }

    return NextResponse.json(document);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao carregar assinatura." },
      { status: 500 }
    );
  }
}
