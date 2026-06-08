import { NextResponse } from "next/server";

import { updateLeagueParticipantPhoto } from "@/lib/axionLeague";
import { uploadAxionLeagueParticipantPhoto } from "@/lib/axionLeagueStorage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const userId = String(form.get("userId") || "").trim();
    const file = form.get("file") as File | null;

    if (!userId) {
      return NextResponse.json({ error: "userId e obrigatorio." }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: "file e obrigatorio." }, { status: 400 });
    }

    const uploaded = await uploadAxionLeagueParticipantPhoto({
      fileBuffer: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type,
      employeeSlug: userId,
    });

    const users = await updateLeagueParticipantPhoto({
      userId,
      photoUrl: uploaded.publicUrl,
    });

    return NextResponse.json({
      ok: true,
      photoUrl: uploaded.publicUrl,
      users,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro interno ao subir foto do participante.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
