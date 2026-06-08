import { NextResponse } from "next/server";

import { getLeagueAvailableUsers, saveLeagueParticipants } from "@/lib/axionLeague";

export async function GET() {
  try {
    const users = await getLeagueAvailableUsers();
    return NextResponse.json(users);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro interno ao carregar participantes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const participants = Array.isArray(body?.participants) ? body.participants : [];

    const normalized = participants
      .map((item) => ({
        userId: typeof item?.userId === "string" ? item.userId : "",
        nickname: typeof item?.nickname === "string" ? item.nickname : "",
        participating: Boolean(item?.participating),
      }))
      .filter((item) => item.userId);

    const users = await saveLeagueParticipants(normalized);
    return NextResponse.json({ ok: true, users });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro interno ao salvar participantes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
