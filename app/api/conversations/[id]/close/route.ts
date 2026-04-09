import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getConversationManagement, upsertConversationManagement } from "@/lib/conversationManagement"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id: conversationId } = await context.params
    const body = await req.json().catch(() => null)
    const byUserId = String(body?.byUserId || "")

    if (!conversationId) {
      return NextResponse.json({ ok: false, error: "conversationId é obrigatório" }, { status: 400 })
    }

    const { data: conversation, error: conversationError } = await supabaseAdmin
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .single()

    if (conversationError || !conversation) {
      return NextResponse.json({ ok: false, error: "Conversa não encontrada" }, { status: 404 })
    }

    const current = await getConversationManagement(conversationId)

    const management = await upsertConversationManagement({
      conversation_id: conversationId,
      status: "closed",
      closed_by_user_id: byUserId || current?.closed_by_user_id || null,
      closed_at: new Date().toISOString()
    })

    return NextResponse.json({ ok: true, data: management })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao finalizar atendimento"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
