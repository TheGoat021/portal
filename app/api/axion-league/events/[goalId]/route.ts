import { NextResponse } from "next/server";

import { getLeagueEventById } from "@/lib/axionLeague";

export async function GET(
  _request: Request,
  context: { params: Promise<{ goalId: string }> },
) {
  try {
    const { goalId } = await context.params;
    const event = await getLeagueEventById(goalId);

    if (!event) {
      return NextResponse.json({ error: "Evento nao encontrado." }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno ao buscar evento.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
