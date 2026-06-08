import { NextResponse } from "next/server";

import { closeCurrentLeagueRound } from "@/lib/axionLeague";

export async function POST() {
  try {
    const result = await closeCurrentLeagueRound();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro interno ao encerrar rodada.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
