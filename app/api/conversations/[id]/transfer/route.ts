import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id: conversationId } = await context.params
    const body = await req.json().catch(() => null)
    const toUserId = body?.toUserId as string | undefined

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId é obrigatório" },
        { status: 400 }
      )
    }

    if (!toUserId) {
      return NextResponse.json(
        { error: "toUserId é obrigatório" },
        { status: 400 }
      )
    }

    const { data: conversation, error: conversationError } = await supabaseAdmin
      .from("conversations")
      .select("id, agent_id, agent_name")
      .eq("id", conversationId)
      .single()

    if (conversationError || !conversation) {
      console.error("Erro ao buscar conversa:", conversationError)
      return NextResponse.json(
        { error: "Conversa não encontrada" },
        { status: 404 }
      )
    }

    const { data: targetAgent, error: targetAgentError } = await supabaseAdmin
      .from("portal_users")
      .select("id, email")
      .eq("id", toUserId)
      .single()

    if (targetAgentError || !targetAgent) {
      console.error("Erro ao buscar atendente destino:", targetAgentError)
      return NextResponse.json(
        { error: "Atendente de destino não encontrado" },
        { status: 404 }
      )
    }

    const previousAgentName = conversation.agent_name ?? "Sem atendente"
    const nextAgentName = targetAgent.email?.trim() || "Atendente"

    const { error: updateConversationError } = await supabaseAdmin
      .from("conversations")
      .update({
        agent_id: targetAgent.id,
        agent_name: nextAgentName
      })
      .eq("id", conversationId)

    if (updateConversationError) {
      console.error("Erro ao atualizar conversa:", updateConversationError)
      return NextResponse.json(
        { error: "Erro ao transferir conversa" },
        { status: 500 }
      )
    }

    const eventMessage = `Atendente alterado de "${previousAgentName}" para "${nextAgentName}"`

    const { error: eventError } = await supabaseAdmin
      .from("conversation_events")
      .insert({
        conversation_id: conversationId,
        type: "transfer",
        message: eventMessage
      })

    if (eventError) {
      console.error("Erro ao registrar evento de transferência:", eventError)
      return NextResponse.json(
        { error: "Conversa transferida, mas falhou ao registrar histórico" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      conversationId,
      fromAgentName: conversation.agent_name ?? null,
      toAgentId: targetAgent.id,
      toAgentName: nextAgentName,
      message: eventMessage
    })
  } catch (error) {
    console.error("Erro em /api/conversations/[id]/transfer:", error)

    return NextResponse.json(
      { error: "Erro interno ao transferir conversa" },
      { status: 500 }
    )
  }
}