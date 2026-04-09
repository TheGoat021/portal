import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { upsertMetaConversationManagement } from "@/lib/metaConversationManagement"
import { insertMetaMessage, touchMetaConversation } from "@/lib/metaDb"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id: conversationId } = await context.params
    const body = await req.json().catch(() => null)
    const toUserId = String(body?.toUserId || "")
    const byUserId = String(body?.byUserId || "")

    if (!conversationId) {
      return NextResponse.json({ ok: false, error: "conversationId é obrigatório" }, { status: 400 })
    }

    if (!toUserId) {
      return NextResponse.json({ ok: false, error: "toUserId é obrigatório" }, { status: 400 })
    }

    const [{ data: conversation, error: conversationError }, { data: user, error: userError }] =
      await Promise.all([
        supabaseAdmin
          .from("meta_conversations")
          .select("id, connection_id")
          .eq("id", conversationId)
          .single(),
        supabaseAdmin
          .from("profiles")
          .select("id, email, role")
          .eq("id", toUserId)
          .single()
      ])

    if (conversationError || !conversation) {
      return NextResponse.json({ ok: false, error: "Conversa Meta não encontrada" }, { status: 404 })
    }

    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Atendente de destino não encontrado" }, { status: 404 })
    }

    const management = await upsertMetaConversationManagement({
      conversation_id: conversation.id,
      connection_id: conversation.connection_id,
      status: "open",
      assigned_user_id: user.id,
      assigned_user_email: user.email ?? null,
      assigned_department: user.role ?? null,
      closed_at: null,
      closed_by_user_id: null
    })

    let actorEmail = "Sistema"
    if (byUserId) {
      const { data: actor } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("id", byUserId)
        .maybeSingle()

      if (actor?.email) {
        actorEmail = String(actor.email)
      }
    }

    const targetEmail = user.email ? String(user.email) : "Sem e-mail"
    const transferText = `Atendimento transferido por ${actorEmail} para ${targetEmail}.`

    await insertMetaMessage({
      conversationId: conversation.id,
      connectionId: conversation.connection_id,
      direction: "outbound",
      status: "sent",
      fromPhone: null,
      toPhone: null,
      type: "system",
      message: transferText,
      caption: null,
      mediaId: null,
      mimeType: null,
      mediaUrl: null,
      fileName: null,
      sha256: null,
      contextMessageId: null,
      rawPayload: {
        event: "transfer",
        byUserId: byUserId || null,
        toUserId: user.id,
        actorEmail,
        targetEmail
      }
    })

    await touchMetaConversation({
      conversationId: conversation.id,
      lastMessage: transferText,
      lastMessageType: "system",
      incrementUnread: false
    })

    return NextResponse.json({
      ok: true,
      data: management
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao transferir conversa Meta"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
