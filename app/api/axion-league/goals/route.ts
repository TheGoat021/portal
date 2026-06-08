import { NextResponse } from "next/server";

import { registerLeagueGoal } from "@/lib/axionLeague";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const employeeId = typeof body.employeeId === "string" ? body.employeeId : "";
    const type = body.type === "sale" || body.type === "recovery" ? body.type : null;
    const observation =
      typeof body.observation === "string" && body.observation.trim().length > 0
        ? body.observation
        : undefined;

    if (!employeeId || !type) {
      return NextResponse.json(
        { error: "employeeId e type sao obrigatorios." },
        { status: 400 },
      );
    }

    const goal = await registerLeagueGoal({
      employeeId,
      type,
      observation,
    });

    return NextResponse.json({ ok: true, goal });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno ao registrar gol.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
