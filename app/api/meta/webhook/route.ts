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

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v23.0'
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`

function getFirstNonEmpty<T = any>(...values: T[]) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }
  return null
}

function normalizeDigits(value?: string | null) {
  if (!value) return null
  const digits = String(value).replace(/\D/g, '')
  return digits || null
}

async function getWabaPhoneNumbers(wabaId: string, token: string) {
  const url = new URL(`${GRAPH_BASE}/${wabaId}/phone_numbers`)
  url.searchParams.set('fields', 'id,display_phone_number,verified_name,quality_rating')

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: 'no-store'
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data?.error?.message || 'Erro ao buscar números do WABA')
  }

  const firstPhone = data?.data?.[0]
  if (!firstPhone?.id) {
    throw new Error('Nenhum número encontrado para este WABA')
  }

  return firstPhone
}

async function getClientWabasFromBusiness(businessId: string, token: string) {
  const url = new URL(`${GRAPH_BASE}/${businessId}/client_whatsapp_business_accounts`)

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: 'no-store'
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(
      data?.error?.message || 'Erro ao buscar client_whatsapp_business_accounts'
    )
  }

  return Array.isArray(data?.data) ? data.data : []
}

async function subscribeApp(wabaId: string, token: string) {
  const res = await fetch(`${GRAPH_BASE}/${wabaId}/subscribed_apps`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    cache: 'no-store'
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data?.error?.message || 'Erro ao vincular app no WABA')
  }

  return data
}

async function registerPhone(phoneNumberId: string, token: string) {
  const res = await fetch(`${GRAPH_BASE}/${phoneNumberId}/register`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp'
    }),
    cache: 'no-store'
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data?.error?.message || 'Erro ao registrar número')
  }

  return data
}

function extractAccountUpdateInfo(value: any) {
  const eventName = getFirstNonEmpty(
    value?.event,
    value?.events?.[0]?.event,
    value?.status,
    value?.account_update?.event
  )

  const wabaId = getFirstNonEmpty(
    value?.waba_info?.waba_id,
    value?.waba_id,
    value?.whatsapp_business_account?.id,
    value?.whatsapp_business_account_id,
    value?.account_update?.waba_id,
    value?.id
  )

  const phoneNumberId = getFirstNonEmpty(
    value?.phone_number_id,
    value?.phone?.id,
    value?.phone_number?.id,
    value?.metadata?.phone_number_id
  )

  const displayPhoneNumber = getFirstNonEmpty(
    value?.display_phone_number,
    value?.phone?.display_phone_number,
    value?.phone_number?.display_phone_number,
    value?.metadata?.display_phone_number
  )

  const verifiedName = getFirstNonEmpty(
    value?.verified_name,
    value?.phone?.verified_name,
    value?.phone_number?.verified_name
  )

  return {
    eventName: eventName ? String(eventName).toUpperCase() : null,
    wabaId: wabaId ? String(wabaId) : null,
    phoneNumberId: phoneNumberId ? String(phoneNumberId) : null,
    displayPhoneNumber: displayPhoneNumber ? String(displayPhoneNumber) : null,
    verifiedName: verifiedName ? String(verifiedName) : null
  }
}

async function completePendingConnectionFromAccountUpdate(value: any) {
  const extracted = extractAccountUpdateInfo(value)

  console.log('ACCOUNT_UPDATE RAW:', JSON.stringify(value, null, 2))
  console.log('ACCOUNT_UPDATE EXTRACTED:', extracted)

  const allowedEvents = new Set([
    '',
    'PARTNER_ADDED',
    'PARTNER_APP_INSTALLED',
    'ACCOUNT_UPDATE'
  ])

  if (extracted.eventName && !allowedEvents.has(extracted.eventName)) {
    console.log('account_update ignorado por tipo de evento:', extracted.eventName)
    return
  }

  const { data: pendingConnections, error: pendingError } = await supabaseAdmin
    .from('whatsapp_meta_connections')
    .select('*')
    .eq('status', 'pending_waba')
    .order('created_at', { ascending: false })

  if (pendingError) {
    throw new Error(pendingError.message)
  }

  if (!pendingConnections?.length) {
    console.log('Nenhuma conexão pending_waba encontrada')
    return
  }

  const normalizedDisplayNumber = normalizeDigits(extracted.displayPhoneNumber)

  for (const connection of pendingConnections) {
    if (!connection.business_token) continue

    try {
      let resolvedWabaId = extracted.wabaId || connection.waba_id || null

      if (!resolvedWabaId && connection.business_id) {
        try {
          const clientWabas = await getClientWabasFromBusiness(
            connection.business_id,
            connection.business_token
          )

          console.log(
            'FALLBACK CLIENT_WABAS:',
            JSON.stringify(clientWabas, null, 2)
          )

          if (clientWabas.length > 0) {
            resolvedWabaId = clientWabas[0]?.id || null
          }
        } catch (fallbackError) {
          console.error('Falha no fallback de WABA via business_id:', fallbackError)
        }
      }

      if (!resolvedWabaId) {
        console.log('Ainda sem wabaId, aguardando próximo webhook...')
        continue
      }

      const phone =
        extracted.phoneNumberId && extracted.displayPhoneNumber
          ? {
              id: extracted.phoneNumberId,
              display_phone_number: extracted.displayPhoneNumber,
              verified_name: extracted.verifiedName ?? null,
              quality_rating: null
            }
          : await getWabaPhoneNumbers(resolvedWabaId, connection.business_token)

      await subscribeApp(resolvedWabaId, connection.business_token)
      await registerPhone(phone.id, connection.business_token)

      const currentMetadata =
        connection.metadata && typeof connection.metadata === 'object'
          ? connection.metadata
          : {}

      const { error: updateError } = await supabaseAdmin
        .from('whatsapp_meta_connections')
        .update({
          status: 'connected',
          waba_id: resolvedWabaId,
          phone_number_id: phone.id,
          display_phone_number:
            phone.display_phone_number ?? extracted.displayPhoneNumber ?? null,
          verified_name: phone.verified_name ?? extracted.verifiedName ?? null,
          quality_rating: phone.quality_rating ?? null,
          webhook_verified: true,
          metadata: {
            ...currentMetadata,
            account_update: value,
            account_update_processed_at: new Date().toISOString(),
            account_update_display_phone_number_normalized: normalizedDisplayNumber
          }
        })
        .eq('id', connection.id)

      if (updateError) {
        throw new Error(updateError.message)
      }

      console.log('Conexão Meta pendente concluída via account_update:', {
        connectionId: connection.id,
        wabaId: resolvedWabaId,
        phoneNumberId: phone.id
      })

      return
    } catch (err) {
      console.error('Falha ao completar conexão pendente via account_update:', err)
    }
  }
}

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

    console.log('META WEBHOOK BODY:', JSON.stringify(body, null, 2))

    const entries = extractWebhookEntries(body)

    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : []

      for (const change of changes) {
        const field = change?.field
        const value = change?.value

        if (field === 'account_update') {
          await completePendingConnectionFromAccountUpdate(value)
          continue
        }

        const metadata = value?.metadata
        const phoneNumberId = metadata?.phone_number_id

        if (!phoneNumberId) continue

        const connection = await getMetaConnectionByPhoneNumberId(phoneNumberId)
        if (!connection?.business_token) continue

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