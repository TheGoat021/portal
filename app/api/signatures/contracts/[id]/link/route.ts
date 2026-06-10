import { NextResponse } from "next/server";

import { getSignatureLink } from "@/lib/signatures";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    return NextResponse.json(await getSignatureLink(id));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao consultar link." },
      { status: 500 }
    );
  }
}
