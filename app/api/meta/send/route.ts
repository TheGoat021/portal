import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import {
  ensureMetaConversation,
  insertMetaMessage,
  touchMetaConversation
} from '@/lib/metaDb'
import { upsertMetaConversationManagement } from '@/lib/metaConversationManagement'

export const runtime = 'nodejs'

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v23.0'
const PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN

type Body = {
  to: string
  message: string
  connectionId?: string | null
  companyId?: string | null
  agentId?: string | null
  agentEmail?: string | null
}

function normalizePhone(phone?: string | null) {
  if (!phone) return ''
  return String(phone).replace(/\D/g, '')
}

async function getDefaultConnection() {
  if (PHONE_NUMBER_ID) {
    const { data } = await supabaseAdmin
      .from('whatsapp_meta_connections')
      .select('*')
      .eq('provider', 'meta')
      .eq('phone_number_id', PHONE_NUMBER_ID)
      .maybeSingle()

    if (data) return data
  }

  return null
}

export async function POST(req: NextRequest) {
  try {
    if (!PHONE_NUMBER_ID) {
      return NextResponse.json(
        { ok: false, error: 'META_PHONE_NUMBER_ID não configurado' },
        { status: 500 }
      )
    }

    if (!ACCESS_TOKEN) {
      return NextResponse.json(
        { ok: false, error: 'META_ACCESS_TOKEN não configurado' },
        { status: 500 }
      )
    }

    const body = (await req.json()) as Body

    const to = normalizePhone(body?.to)
    const message = String(body?.message || '').trim()

    if (!to) {
      return NextResponse.json(
        { ok: false, error: 'Campo "to" é obrigatório' },
        { status: 400 }
      )
    }

    if (!message) {
      return NextResponse.json(
        { ok: false, error: 'Campo "message" é obrigatório' },
        { status: 400 }
      )
    }

    let connection: any = null

    if (body.connectionId) {
      const { data } = await supabaseAdmin
        .from('whatsapp_meta_connections')
        .select('*')
        .eq('id', body.connectionId)
        .eq('provider', 'meta')
        .maybeSingle()

      connection = data ?? null
    } else {
      connection = await getDefaultConnection()
    }

    if (!connection) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Nenhuma conexão Meta encontrada. Salve a conexão primeiro em /api/meta/connect.'
        },
        { status: 400 }
      )
    }

    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${connection.phone_number_id || PHONE_NUMBER_ID}/messages`

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        preview_url: false,
        body: message
      }
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${connection.business_token || ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      cache: 'no-store'
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: data?.error?.message || 'Erro ao enviar mensagem pela Meta',
          meta: data
        },
        { status: res.status }
      )
    }

    const metaMessageId = data?.messages?.[0]?.id || null

    const conversation = await ensureMetaConversation({
      connectionId: connection.id,
      companyId: body.companyId ?? connection.company_id ?? null,
      waId: to,
      contactName: null,
      profileName: connection.display_phone_number || null
    })

    const saved = await insertMetaMessage({
      conversationId: conversation.id,
      connectionId: connection.id,
      companyId: body.companyId ?? connection.company_id ?? null,
      metaMessageId,
      direction: 'outbound',
      status: 'sent',
      fromPhone: connection.display_phone_number || null,
      toPhone: to,
      type: 'text',
      message,
      caption: null,
      mediaId: null,
      mimeType: null,
      mediaUrl: null,
      fileName: null,
      sha256: null,
      contextMessageId: null,
      rawPayload: {
        ...data,
        agentId: body.agentId ?? null,
        agentEmail: body.agentEmail ?? null
      }
    })

    await touchMetaConversation({
      conversationId: conversation.id,
      lastMessage: saved.message || message,
      lastMessageType: 'text',
      incrementUnread: false
    })

    if (body.agentId && body.agentEmail) {
      const { data: profileResult } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", body.agentId)
        .maybeSingle()

      await upsertMetaConversationManagement({
        conversation_id: conversation.id,
        connection_id: connection.id,
        status: "open",
        assigned_user_id: body.agentId,
        assigned_user_email: body.agentEmail,
        assigned_department: profileResult?.role ? String(profileResult.role) : null,
        closed_at: null,
        closed_by_user_id: null
      })
    }

    return NextResponse.json({
      ok: true,
      data,
      savedMessageId: saved?.id ?? null,
      conversationId: conversation?.id ?? null
    })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro interno ao enviar mensagem' },
      { status: 500 }
    )
  }
}
