// app/api/whatsapp-meta/conversations/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const connectionId = url.searchParams.get('connectionId')
    const search = url.searchParams.get('search')?.trim() || ''

    if (!connectionId) {
      return NextResponse.json({ error: 'connectionId é obrigatório' }, { status: 400 })
    }

    let query = supabaseAdmin
      .from('meta_conversations')
      .select('*')
      .eq('connection_id', connectionId)
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (search) {
      query = query.or(
        `wa_id.ilike.%${search}%,contact_name.ilike.%${search}%,profile_name.ilike.%${search}%,last_message.ilike.%${search}%`
      )
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: managementRows, error: managementRowsError } = await supabaseAdmin
      .from("meta_conversation_management")
      .select("conversation_id, status, assigned_user_id, assigned_department, updated_at")
      .eq("connection_id", connectionId)
      .order("updated_at", { ascending: false })

    if (managementRowsError) {
      return NextResponse.json({ error: managementRowsError.message }, { status: 500 })
    }

    const { data: sessionRows, error: sessionRowsError } = await supabaseAdmin
      .from("meta_chatbot_sessions")
      .select("conversation_id, state")
      .eq("connection_id", connectionId)

    if (sessionRowsError) {
      return NextResponse.json({ error: sessionRowsError.message }, { status: 500 })
    }

    const latestManagementByConversation = new Map<
      string,
      { status: string; assigned_user_id: string | null; assigned_department: string | null }
    >()

    for (const row of managementRows ?? []) {
      const conversationId = String(row.conversation_id)
      if (!latestManagementByConversation.has(conversationId)) {
        latestManagementByConversation.set(conversationId, {
          status: String(row.status || "open"),
          assigned_user_id: row.assigned_user_id ? String(row.assigned_user_id) : null,
          assigned_department: row.assigned_department ? String(row.assigned_department) : null
        })
      }
    }

    const sessionStateByConversation = new Map<string, string>()
    for (const row of sessionRows ?? []) {
      sessionStateByConversation.set(String(row.conversation_id), String(row.state || "active"))
    }

    const conversationsWithServiceState = (data ?? []).map((conversation) => {
      const conversationId = String(conversation.id)
      const management = latestManagementByConversation.get(conversationId)
      const sessionState = sessionStateByConversation.get(conversationId)

      const isClosed = management?.status === "closed"
      const hasOperator =
        Boolean(management?.assigned_user_id) ||
        Boolean((management?.assigned_department || "").trim()) ||
        sessionState === "completed" ||
        sessionState === "disabled"

      const service_state = isClosed ? "closed" : hasOperator ? "operator" : "bot"

      return {
        ...conversation,
        service_state
      }
    })

    return NextResponse.json({
      ok: true,
      data: conversationsWithServiceState
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao listar conversas'
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    )
  }
}
