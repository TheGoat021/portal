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
      .select("conversation_id, status, updated_at")
      .eq("connection_id", connectionId)
      .order("updated_at", { ascending: false })

    if (managementRowsError) {
      return NextResponse.json({ error: managementRowsError.message }, { status: 500 })
    }

    const latestStatusByConversation = new Map<string, string>()
    for (const row of managementRows ?? []) {
      const conversationId = String(row.conversation_id)
      if (!latestStatusByConversation.has(conversationId)) {
        latestStatusByConversation.set(conversationId, String(row.status || "open"))
      }
    }

    const closedIds = new Set(
      Array.from(latestStatusByConversation.entries())
        .filter(([, status]) => status === "closed")
        .map(([conversationId]) => conversationId)
    )

    const visibleConversations = (data ?? []).filter((conversation) => !closedIds.has(String(conversation.id)))

    return NextResponse.json({
      ok: true,
      data: visibleConversations
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao listar conversas'
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    )
  }
}
