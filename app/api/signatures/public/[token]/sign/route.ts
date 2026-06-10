import { NextRequest, NextResponse } from "next/server";

import { submitPublicSignature } from "@/lib/signatures";
import type { SignatureFont } from "@/types/signatures";

function extractIpAddress(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || null;
  }

  return request.headers.get("x-real-ip");
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const body = await request.json();

    const fullName = String(body.fullName || "").trim();
    const phone = String(body.phone || "").trim();
    const cpf = String(body.cpf || "").trim();
    const signatureFont = String(body.signatureFont || "classic") as SignatureFont;

    if (!fullName || !phone || !cpf) {
      return NextResponse.json({ error: "Nome, telefone e CPF sao obrigatorios." }, { status: 400 });
    }

    const document = await submitPublicSignature({
      token,
      fullName,
      phone,
      cpf,
      signatureFont,
      ipAddress: extractIpAddress(request),
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json(document);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao assinar contrato." },
      { status: 500 }
    );
  }
}
