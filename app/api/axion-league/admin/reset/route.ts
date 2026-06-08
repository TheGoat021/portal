import { NextResponse } from "next/server";

import { resetLeagueChampionship } from "@/lib/axionLeague";

export async function POST() {
  try {
    const result = await resetLeagueChampionship();
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro interno ao resetar campeonato.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
