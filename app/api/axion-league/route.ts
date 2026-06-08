import { NextResponse } from "next/server";

import { getLeagueSnapshot } from "@/lib/axionLeague";

export async function GET() {
  try {
    const snapshot = await getLeagueSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno ao carregar a liga.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
