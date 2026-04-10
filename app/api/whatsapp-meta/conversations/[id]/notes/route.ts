import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id: conversationId } = await context.params
    if (!conversationId) {
      return NextResponse.json({ ok: false, error: "conversationId e obrigatorio" }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from("meta_conversation_notes")
      .select("id, conversation_id, user_id, user_email, note, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, data: data ?? [] })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao carregar notas"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id: conversationId } = await context.params
    const body = await req.json().catch(() => null)
    const note = String(body?.note || "").trim()
    const userId = String(body?.userId || "") || null
    const userEmail = String(body?.userEmail || "") || null

    if (!conversationId) {
      return NextResponse.json({ ok: false, error: "conversationId e obrigatorio" }, { status: 400 })
    }

    if (!note) {
      return NextResponse.json({ ok: false, error: "Nota vazia" }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from("meta_conversation_notes")
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        user_email: userEmail,
        note
      })
      .select("id, conversation_id, user_id, user_email, note, created_at")
      .single()

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao salvar nota"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
