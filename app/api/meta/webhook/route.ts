import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import {
  ensureMetaConversation,
  getInboundTypeAndContent,
  getMetaConnectionByPhoneNumberId,
  insertMetaMessage,
  insertMetaStatus,
  touchMetaConversation
} from '@/lib/metaDb'
import { uploadMetaInboundMedia } from '@/lib/metaStorage'
import { runMetaChatbotForInbound } from '@/lib/metaChatbot'
import {
  downloadMediaFile,
  extractWebhookEntries,
  getMediaInfo,
  normalizePhone
} from '@/lib/whatsappMeta'

export const runtime = 'nodejs'

type WebhookContact = {
  wa_id?: string
  profile?: {
    name?: string
  }
}

type WebhookMessage = {
  id?: string
  from?: string
  [key: string]: unknown
}

type WebhookStatus = {
  id?: string
  status?: string
  [key: string]: unknown
}

type WebhookValue = {
  metadata?: {
    display_phone_number?: string
    phone_number_id?: string
  }
  contacts?: WebhookContact[]
  messages?: WebhookMessage[]
  statuses?: WebhookStatus[]
  [key: string]: unknown
}

type WebhookChange = {
  value?: WebhookValue
}

type WebhookEntry = {
  changes?: WebhookChange[]
}

async function handleInboundMessage({
  connection,
  value,
  message,
  contact
}: {
  connection: {
    id: string
    company_id?: string | null
    business_token: string
  }
  value: WebhookValue
  message: WebhookMessage
  contact?: WebhookContact
}) {
  
  const fromPhone = normalizePhone(message?.from)
  if (!fromPhone) return

  const conversation = await ensureMetaConversation({
    connectionId: connection.id,
    companyId: connection.company_id,
    waId: fromPhone,
    contactName: contact?.profile?.name || null,
    profileName: value?.metadata?.display_phone_number || null
  })


  const parsed = getInboundTypeAndContent(message)

  let mediaUrl: string | null = null
  let sha256: string | null = null

  if (parsed.mediaId) {
    try {
      const mediaInfo = await getMediaInfo(parsed.mediaId, connection.business_token)
      const buffer = await downloadMediaFile(mediaInfo.url, connection.business_token)

      const uploaded = await uploadMetaInboundMedia({
        fileBuffer: buffer,
        mimeType: parsed.mimeType || mediaInfo.mime_type || null,
        connectionId: connection.id,
        waId: fromPhone,
        mediaId: parsed.mediaId
      })

      mediaUrl = uploaded.publicUrl
      sha256 = uploaded.sha256
    } catch (mediaError) {
      console.error('Falha ao processar mídia inbound da Meta:', mediaError)
    }
  }

  const saved = await insertMetaMessage({
    conversationId: conversation.id,
    connectionId: connection.id,
    companyId: connection.company_id,
    metaMessageId: message?.id || null,
    direction: 'inbound',
    status: 'received',
    fromPhone,
    toPhone: value?.metadata?.display_phone_number || null,
    type: parsed.type,
    message: parsed.text,
    caption: parsed.caption,
    mediaId: parsed.mediaId,
    mimeType: parsed.mimeType,
    mediaUrl,
    fileName: parsed.fileName,
    sha256,
    contextMessageId: parsed.contextMessageId,
    rawPayload: message
  })

  await touchMetaConversation({
    conversationId: conversation.id,
    lastMessage: saved.message || parsed.text || 'Mensagem',
    lastMessageType: parsed.type,
    incrementUnread: true
  })

  const { error: reopenError } = await supabaseAdmin
    .from("meta_conversation_management")
    .update({
      status: "open",
      closed_at: null,
      closed_by_user_id: null,
      updated_at: new Date().toISOString()
    })
    .eq("conversation_id", conversation.id)
    .eq("status", "closed")

  if (reopenError) {
    console.error("Erro ao reabrir conversa Meta arquivada:", reopenError)
  }

  if (parsed.type === "text" && (parsed.text || "").trim()) {
    try {
      await runMetaChatbotForInbound({
        connectionId: connection.id,
        conversationId: conversation.id,
        to: fromPhone,
        inboundText: parsed.text || ""
      })
    } catch (chatbotError) {
      console.error("Erro ao executar fluxo do chatbot Meta:", chatbotError)
    }
  }
}

async function handleStatuses(statuses: WebhookStatus[]) {
  for (const status of statuses) {
    const metaMessageId = status?.id
    const state = status?.status

    if (!metaMessageId || !state) continue

    console.log('META STATUS UPDATE:', {
      metaMessageId,
      state,
      hasError: Boolean((status as { errors?: unknown[] }).errors?.length)
    })

    if (state === 'failed') {
      console.error('META STATUS FAILED:', {
        metaMessageId,
        status,
        errors: JSON.stringify((status as { errors?: unknown }).errors ?? null, null, 2)
      })
    }

    await insertMetaStatus({
      metaMessageId,
      status: state,
      rawPayload: status
    })
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge || '', { status: 200 })
  }

  return new NextResponse('Forbidden', { status: 403 })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const entries = extractWebhookEntries(body) as WebhookEntry[]
    console.log('META WEBHOOK RECEIVED:', { entries: entries.length })

    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : []

      for (const change of changes) {
        const value = change?.value
        if (!value) continue

        const metadata = value?.metadata
        const phoneNumberId = metadata?.phone_number_id

        if (!phoneNumberId) continue

        const connection = await getMetaConnectionByPhoneNumberId(phoneNumberId)
        if (!connection?.business_token) continue

        if (!connection.webhook_verified) {
          await supabaseAdmin
            .from('whatsapp_meta_connections')
            .update({
              webhook_verified: true
            })
            .eq('id', connection.id)
        }

        const contacts = Array.isArray(value?.contacts) ? value.contacts : []
        const messages = Array.isArray(value?.messages) ? value.messages : []
        const statuses = Array.isArray(value?.statuses) ? value.statuses : []

        if (messages.length > 0) {
          for (const message of messages) {
            const contact = contacts.find((c) => normalizePhone(c?.wa_id) === normalizePhone(message?.from))

            await handleInboundMessage({
              connection,
              value,
              message,
              contact
            })
          }
        }

        if (statuses.length > 0) {
          await handleStatuses(statuses)
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro no webhook da Meta'
    console.error('META WEBHOOK ERROR:', error)

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    )
  }
}
