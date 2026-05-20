import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function GET(req: NextRequest) {
  try {
    const scope = req.nextUrl.searchParams.get("scope") || "all"

    let query = supabaseAdmin
      .from("voice_calls")
      .select(`
        id,
        phone,
        normalized_phone,
        called_number,
        did_number,
        dialed_extension,
        direction,
        status,
        started_at,
        answered_at,
        ended_at,
        wait_seconds,
        duration_seconds,
        queue_id,
        agent_id,
        recording_url,
        cliente_id,
        lead_id
      `)
      .order("started_at", { ascending: false })
      .limit(300)

    if (scope === "active") {
      query = query.in("status", ["ringing", "queued", "answered"])
    }

    if (scope === "history") {
      query = query.not("ended_at", "is", null)
    }

    const { data, error } = await query

    if (error) {
      const looksLikeMissingVoiceSchema =
        error.code === "42P01" ||
        /voice_calls/i.test(error.message)

      if (looksLikeMissingVoiceSchema) {
        return NextResponse.json({ calls: [], warning: "Tabela voice_calls ainda indisponivel." })
      }

      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      calls: data ?? []
    })
  } catch (error) {
    console.error("Erro ao listar chamadas de voz:", error)
    return NextResponse.json(
      { error: "Erro interno ao listar chamadas do Axion Voice." },
      { status: 500 }
    )
  }
}
