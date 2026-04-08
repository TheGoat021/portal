import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { connectionId?: string }
    const connectionId = String(body?.connectionId || "")

    if (!connectionId) {
      return NextResponse.json({ ok: false, error: "connectionId é obrigatório" }, { status: 400 })
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("meta_chatbot_flows")
      .select("connection_id, draft_flow")
      .eq("connection_id", connectionId)
      .maybeSingle()

    if (fetchError) {
      return NextResponse.json({ ok: false, error: fetchError.message }, { status: 500 })
    }

    if (!existing) {
      return NextResponse.json({ ok: false, error: "Fluxo draft não encontrado para essa conexão" }, { status: 404 })
    }

    const { data, error } = await supabaseAdmin
      .from("meta_chatbot_flows")
      .update({
        published_flow: existing.draft_flow,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("connection_id", connectionId)
      .select("connection_id, published_at")
      .single()

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      data: {
        connectionId: data.connection_id,
        publishedAt: data.published_at
      }
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao publicar fluxo do chatbot"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

