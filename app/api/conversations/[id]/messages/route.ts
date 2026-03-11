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
      return NextResponse.json(
        { error: "conversationId é obrigatório" },
        { status: 400 }
      )
    }

    const [{ data: messages, error: messagesError }, { data: events, error: eventsError }] =
      await Promise.all([
        supabaseAdmin
          .from("messages")
          .select(`
            id,
            conversation_id,
            message,
            direction,
            created_at,
            type,
            media_url,
            agent_id,
            agent_name,
            status,
            raw_type,
            quoted_message,
            quoted_whatsapp_message_id,
            whatsapp_message_id
          `)
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true }),

        supabaseAdmin
          .from("conversation_events")
          .select(`
            id,
            conversation_id,
            type,
            message,
            created_at
          `)
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true })
      ])

    if (messagesError) {
      console.error("Erro ao buscar mensagens:", messagesError)
      return NextResponse.json(
        { error: "Erro ao buscar mensagens" },
        { status: 500 }
      )
    }

    if (eventsError) {
      console.error("Erro ao buscar eventos:", eventsError)
      return NextResponse.json(
        { error: "Erro ao buscar eventos da conversa" },
        { status: 500 }
      )
    }

    const normalizedMessages = (messages ?? []).map((msg) => ({
      id: String(msg.id),
      conversation_id: msg.conversation_id,
      message: msg.message ?? "",
      direction: msg.direction ?? "outbound",
      created_at: msg.created_at,
      type: msg.type ?? "text",
      media_url: msg.media_url ?? null,
      agent_id: msg.agent_id ?? null,
      agent_name: msg.agent_name ?? null,
      status: msg.status ?? null,
      raw_type: msg.raw_type ?? null,
      quoted_message: msg.quoted_message ?? null,
      quoted_whatsapp_message_id: msg.quoted_whatsapp_message_id ?? null,
      whatsapp_message_id: msg.whatsapp_message_id ?? null,
      is_system: false
    }))

    const normalizedEvents = (events ?? []).map((evt) => ({
      id: `event-${evt.id}`,
      conversation_id: evt.conversation_id,
      message: evt.message ?? "",
      direction: "outbound" as const,
      created_at: evt.created_at,
      type: "system",
      media_url: null,
      agent_id: null,
      agent_name: null,
      status: null,
      raw_type: null,
      quoted_message: null,
      quoted_whatsapp_message_id: null,
      whatsapp_message_id: null,
      is_system: true
    }))

    const merged = [...normalizedMessages, ...normalizedEvents].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return dateA - dateB
    })

    const deduped: typeof merged = []
    const seen = new Set<string>()

    for (const item of merged) {
      const timestampBucket = Math.floor(new Date(item.created_at).getTime() / 1000)

      const key = item.is_system
        ? [
            "system",
            item.conversation_id,
            item.message.trim(),
            timestampBucket
          ].join("|")
        : [
            item.direction,
            item.type,
            item.conversation_id,
            (item.message ?? "").trim(),
            item.media_url ?? "",
            item.agent_name ?? "",
            item.whatsapp_message_id ?? "",
            timestampBucket
          ].join("|")

      if (seen.has(key)) continue

      seen.add(key)
      deduped.push(item)
    }

    return NextResponse.json(deduped)
  } catch (error) {
    console.error("Erro em /api/conversations/[id]/messages:", error)

    return NextResponse.json(
      { error: "Erro interno ao buscar histórico da conversa" },
      { status: 500 }
    )
  }
}