import { NextResponse } from "next/server";

import { adjustLeagueMatchScore } from "@/lib/axionLeague";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const matchId = typeof body.matchId === "string" ? body.matchId : "";
    const playerAScore = Number(body.playerAScore);
    const playerBScore = Number(body.playerBScore);

    if (!matchId || !Number.isInteger(playerAScore) || !Number.isInteger(playerBScore)) {
      return NextResponse.json(
        { error: "matchId, playerAScore e playerBScore sao obrigatorios." },
        { status: 400 },
      );
    }

    const result = await adjustLeagueMatchScore({
      matchId,
      playerAScore,
      playerBScore,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno ao ajustar placar.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
