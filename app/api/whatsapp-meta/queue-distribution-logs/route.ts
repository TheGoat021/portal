import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

function normalizeRole(role: string) {
  return role.trim().toUpperCase()
}

function isManagerRole(role: string) {
  const normalized = normalizeRole(role)
  return (
    normalized === "DIRETORIA" ||
    normalized === "ADMIN" ||
    normalized === "ADMINISTRACAO" ||
    normalized === "ADMINISTRAÇÃO"
  )
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const connectionId = String(url.searchParams.get("connectionId") || "")
    const actorRole = String(url.searchParams.get("actorRole") || "")
    const limit = Math.min(Number(url.searchParams.get("limit") || "50"), 200)

    if (!connectionId) {
      return NextResponse.json({ ok: false, error: "connectionId e obrigatorio" }, { status: 400 })
    }

    if (!isManagerRole(actorRole)) {
      return NextResponse.json({ ok: false, error: "Sem permissao para visualizar logs" }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from("meta_queue_distribution_logs")
      .select(`
        id,
        connection_id,
        conversation_id,
        department,
        status,
        reason,
        selected_user_id,
        selected_user_email,
        candidates_count,
        eligible_count,
        details,
        created_at
      `)
      .eq("connection_id", connectionId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    const conversationIds = Array.from(
      new Set((data ?? []).map((item) => (item.conversation_id ? String(item.conversation_id) : "")).filter(Boolean))
    )

    const conversationMap = new Map<string, { wa_id: string | null; contact_name: string | null }>()
    if (conversationIds.length > 0) {
      const { data: conversations, error: conversationsError } = await supabaseAdmin
        .from("meta_conversations")
        .select("id, wa_id, contact_name")
        .in("id", conversationIds)

      if (conversationsError) {
        return NextResponse.json({ ok: false, error: conversationsError.message }, { status: 500 })
      }

      for (const conversation of conversations ?? []) {
        conversationMap.set(String(conversation.id), {
          wa_id: conversation.wa_id ? String(conversation.wa_id) : null,
          contact_name: conversation.contact_name ? String(conversation.contact_name) : null
        })
      }
    }

    const enriched = (data ?? []).map((item) => {
      const conversationId = item.conversation_id ? String(item.conversation_id) : null
      const conversation = conversationId ? conversationMap.get(conversationId) : null

      return {
        ...item,
        conversation_wa_id: conversation?.wa_id ?? null,
        conversation_contact_name: conversation?.contact_name ?? null
      }
    })

    return NextResponse.json({ ok: true, data: enriched })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao carregar logs de distribuicao"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

