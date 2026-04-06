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
import {
  downloadMediaFile,
  extractWebhookEntries,
  getMediaInfo,
  normalizePhone
} from '@/lib/whatsappMeta'

export const runtime = 'nodejs'

async function handleInboundMessage({
  connection,
  value,
  message,
  contact
}: {
  connection: any
  value: any
  message: any
  contact?: any
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
}

async function handleStatuses(statuses: any[]) {
  for (const status of statuses) {
    const metaMessageId = status?.id
    const state = status?.status

    if (!metaMessageId || !state) continue

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

    const entries = extractWebhookEntries(body)

    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : []

      for (const change of changes) {
        const value = change?.value
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
            const contact = contacts.find(
              (c: any) => normalizePhone(c?.wa_id) === normalizePhone(message?.from)
            )

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
  } catch (error: any) {
    console.error('META WEBHOOK ERROR:', error)

    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro no webhook da Meta' },
      { status: 500 }
    )
  }
}