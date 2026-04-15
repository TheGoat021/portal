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
import { getMetaConversationManagement, upsertMetaConversationManagement } from '@/lib/metaConversationManagement'
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
  timestamp?: string
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

  let restartByInactivity = false
  try {
    const { data: queueSettings } = await supabaseAdmin
      .from("meta_queue_settings")
      .select("auto_close_inactive_enabled, inactive_close_minutes")
      .eq("connection_id", connection.id)
      .maybeSingle()

    const enabled = Boolean(queueSettings?.auto_close_inactive_enabled)
    const minutes = Number(queueSettings?.inactive_close_minutes ?? 0)
    const lastMessageAt = conversation?.last_message_at ? new Date(String(conversation.last_message_at)).getTime() : NaN

    if (enabled && minutes > 0 && Number.isFinite(lastMessageAt)) {
      const thresholdMs = Date.now() - minutes * 60 * 1000
      restartByInactivity = lastMessageAt <= thresholdMs
    }
  } catch (queueError) {
    console.error("Erro ao avaliar inatividade da conversa Meta:", queueError)
  }


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
      console.error('Falha ao processar mÃ­dia inbound da Meta:', mediaError)
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

  let reopenedFromClosed = false
  let shouldSkipChatbotForStaleClosedInbound = false
  let shouldRestartSessionByInactivity = false
  let inboundMessageMs = Number.NaN

  const inboundTimestampRaw = String(message?.timestamp || "").trim()
  if (inboundTimestampRaw) {
    const asSeconds = Number(inboundTimestampRaw)
    if (Number.isFinite(asSeconds)) {
      // Meta envia timestamp em segundos.
      inboundMessageMs = asSeconds * 1000
    } else {
      const asDate = Date.parse(inboundTimestampRaw)
      if (Number.isFinite(asDate)) {
        inboundMessageMs = asDate
      }
    }
  }

  try {
    const management = await getMetaConversationManagement(conversation.id)
    if (management?.status === "closed") {
      const closedAtMs = management.closed_at ? Date.parse(String(management.closed_at)) : Number.NaN

      // Evita reabrir conversa encerrada por evento inbound antigo/atrasado.
      // Reabre apenas se a mensagem for posterior ao fechamento.
      if (Number.isFinite(inboundMessageMs) && Number.isFinite(closedAtMs) && inboundMessageMs <= closedAtMs) {
        reopenedFromClosed = false
        shouldSkipChatbotForStaleClosedInbound = true
      } else {
        reopenedFromClosed = true
      }

      // So faz restart por inatividade quando a conversa ja estava encerrada.
      shouldRestartSessionByInactivity = restartByInactivity
    } else {
      // Conversa aberta (inclusive em atendimento): nunca remover atribuicao por inatividade aqui.
      shouldRestartSessionByInactivity = false
    }

    if (reopenedFromClosed || shouldRestartSessionByInactivity) {
      await upsertMetaConversationManagement({
        conversation_id: conversation.id,
        connection_id: connection.id,
        status: "open",
        assigned_user_id: null,
        assigned_user_email: null,
        assigned_department: null,
        closed_at: null,
        closed_by_user_id: null
      })
    }
  } catch (managementError) {
    console.error("Erro ao consultar gestão da conversa Meta:", managementError)
  }
  if (!shouldSkipChatbotForStaleClosedInbound && parsed.type === "text" && (parsed.text || "").trim()) {
    try {
      await runMetaChatbotForInbound({
        connectionId: connection.id,
        conversationId: conversation.id,
        to: fromPhone,
        inboundText: parsed.text || "",
        restartSession: reopenedFromClosed || shouldRestartSessionByInactivity
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
