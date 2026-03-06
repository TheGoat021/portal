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

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId é obrigatório" },
        { status: 400 }
      )
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const agentId = String(formData.get("agentId") || "")
    const agentEmail = String(formData.get("agentEmail") || "")

    if (!file) {
      return NextResponse.json(
        { error: "file é obrigatório" },
        { status: 400 }
      )
    }

    if (!agentId || !agentEmail) {
      return NextResponse.json(
        { error: "agentId e agentEmail são obrigatórios" },
        { status: 400 }
      )
    }

    const forwardForm = new FormData()
    forwardForm.append("conversationId", conversationId)
    forwardForm.append("file", file)

    const sendRes = await fetch("https://apiwhats.drdetodos.com.br/send-media", {
      method: "POST",
      body: forwardForm
    })

    if (!sendRes.ok) {
      const errorText = await sendRes.text()
      console.error("Erro no apiwhats /send-media:", errorText)

      return NextResponse.json(
        { error: "Erro ao enviar mídia pelo WhatsApp" },
        { status: 500 }
      )
    }

    await new Promise((resolve) => setTimeout(resolve, 800))

    const { data: lastMessage, error: lastMessageError } = await supabaseAdmin
      .from("messages")
      .select("id, direction, type, created_at")
      .eq("conversation_id", conversationId)
      .eq("direction", "outbound")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastMessageError) {
      console.error("Erro ao buscar última mídia enviada:", lastMessageError)
      return NextResponse.json({
        success: true,
        warning: "Mídia enviada, mas não foi possível vincular o atendente"
      })
    }

    if (!lastMessage) {
      return NextResponse.json({
        success: true,
        warning: "Mídia enviada, mas nenhuma mensagem outbound foi encontrada para atualização"
      })
    }

    const { error: updateMessageError } = await supabaseAdmin
      .from("messages")
      .update({
        agent_id: agentId,
        agent_name: agentEmail
      })
      .eq("id", lastMessage.id)

    if (updateMessageError) {
      console.error("Erro ao atualizar agente da mídia:", updateMessageError)
      return NextResponse.json({
        success: true,
        warning: "Mídia enviada, mas não foi possível salvar o agente na mensagem"
      })
    }

    const { error: updateConversationError } = await supabaseAdmin
      .from("conversations")
      .update({
        agent_id: agentId,
        agent_name: agentEmail
      })
      .eq("id", conversationId)

    if (updateConversationError) {
      console.error("Erro ao atualizar agente da conversa:", updateConversationError)
    }

    return NextResponse.json({
      success: true,
      messageId: lastMessage.id
    })
  } catch (error) {
    console.error("Erro em /api/conversations/[id]/send-media:", error)

    return NextResponse.json(
      { error: "Erro interno ao enviar mídia" },
      { status: 500 }
    )
  }
}