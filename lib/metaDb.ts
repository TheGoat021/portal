// lib/metaDb.ts

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { guessMessageText, normalizePhone } from '@/lib/whatsappMeta'

export async function getMetaConnectionByPhoneNumberId(phoneNumberId: string) {
  const { data, error } = await supabaseAdmin
    .from('whatsapp_meta_connections')
    .select('*')
    .eq('phone_number_id', phoneNumberId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

export async function getMetaConnectionById(connectionId: string) {
  const { data, error } = await supabaseAdmin
    .from('whatsapp_meta_connections')
    .select('*')
    .eq('id', connectionId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

export async function ensureMetaConversation({
  connectionId,
  companyId,
  waId,
  contactName,
  profileName
}: {
  connectionId: string
  companyId?: string | null
  waId: string
  contactName?: string | null
  profileName?: string | null
}) {
  const normalizedWaId = normalizePhone(waId)

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('meta_conversations')
    .select('*')
    .eq('connection_id', connectionId)
    .eq('wa_id', normalizedWaId)
    .maybeSingle()

  if (existingError) throw new Error(existingError.message)

  if (existing) {
    const updatePayload: any = {}

    if (contactName && !existing.contact_name) updatePayload.contact_name = contactName
    if (profileName && !existing.profile_name) updatePayload.profile_name = profileName

    if (Object.keys(updatePayload).length > 0) {
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('meta_conversations')
        .update(updatePayload)
        .eq('id', existing.id)
        .select('*')
        .single()

      if (updateError) throw new Error(updateError.message)
      return updated
    }

    return existing
  }

  const { data, error } = await supabaseAdmin
    .from('meta_conversations')
    .insert({
      company_id: companyId ?? null,
      connection_id: connectionId,
      wa_id: normalizedWaId,
      contact_name: contactName ?? null,
      profile_name: profileName ?? null,
      unread_count: 0
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function touchMetaConversation({
  conversationId,
  lastMessage,
  lastMessageType,
  incrementUnread
}: {
  conversationId: string
  lastMessage: string
  lastMessageType: string
  incrementUnread?: boolean
}) {
  const { data: current, error: currentError } = await supabaseAdmin
    .from('meta_conversations')
    .select('id, unread_count')
    .eq('id', conversationId)
    .single()

  if (currentError) throw new Error(currentError.message)

  const { error } = await supabaseAdmin
    .from('meta_conversations')
    .update({
      last_message: lastMessage,
      last_message_type: lastMessageType,
      last_message_at: new Date().toISOString(),
      unread_count: incrementUnread ? (current.unread_count || 0) + 1 : current.unread_count
    })
    .eq('id', conversationId)

  if (error) throw new Error(error.message)
}

export async function insertMetaMessage({
  conversationId,
  connectionId,
  companyId,
  metaMessageId,
  direction,
  status,
  fromPhone,
  toPhone,
  type,
  message,
  caption,
  mediaId,
  mimeType,
  mediaUrl,
  fileName,
  sha256,
  contextMessageId,
  rawPayload
}: {
  conversationId: string
  connectionId: string
  companyId?: string | null
  metaMessageId?: string | null
  direction: 'inbound' | 'outbound'
  status?: string | null
  fromPhone?: string | null
  toPhone?: string | null
  type: string
  message?: string | null
  caption?: string | null
  mediaId?: string | null
  mimeType?: string | null
  mediaUrl?: string | null
  fileName?: string | null
  sha256?: string | null
  contextMessageId?: string | null
  rawPayload?: any
}) {
  const payload = {
    conversation_id: conversationId,
    connection_id: connectionId,
    company_id: companyId ?? null,
    meta_message_id: metaMessageId ?? null,
    direction,
    status: status ?? (direction === 'inbound' ? 'received' : 'sent'),
    from_phone: normalizePhone(fromPhone),
    to_phone: normalizePhone(toPhone),
    type,
    message: message ?? null,
    caption: caption ?? null,
    media_id: mediaId ?? null,
    mime_type: mimeType ?? null,
    media_url: mediaUrl ?? null,
    file_name: fileName ?? null,
    sha256: sha256 ?? null,
    context_message_id: contextMessageId ?? null,
    raw_payload: rawPayload ?? {}
  }

  const query = supabaseAdmin.from('meta_messages').insert(payload)
  const conflictQuery = metaMessageId
    ? supabaseAdmin
        .from('meta_messages')
        .upsert(payload, { onConflict: 'meta_message_id' })
        .select('*')
        .single()
    : query.select('*').single()

  const { data, error } = await conflictQuery

  if (error) throw new Error(error.message)
  return data
}

export async function insertMetaStatus({
  metaMessageId,
  status,
  rawPayload
}: {
  metaMessageId: string
  status: string
  rawPayload?: any
}) {
  const { data: message } = await supabaseAdmin
    .from('meta_messages')
    .select('id')
    .eq('meta_message_id', metaMessageId)
    .maybeSingle()

  const { error } = await supabaseAdmin
    .from('meta_message_status')
    .insert({
      message_id: message?.id ?? null,
      meta_message_id: metaMessageId,
      status,
      raw_payload: rawPayload ?? {}
    })

  if (error) throw new Error(error.message)

  const { error: updateError } = await supabaseAdmin
    .from('meta_messages')
    .update({ status })
    .eq('meta_message_id', metaMessageId)

  if (updateError) throw new Error(updateError.message)
}

export function getInboundTypeAndContent(message: any) {
  const type = message?.type || 'text'
  const contextMessageId = message?.context?.id || null

  if (type === 'text') {
    return {
      type: 'text',
      text: message?.text?.body || '',
      caption: null,
      mediaId: null,
      mimeType: null,
      fileName: null,
      contextMessageId
    }
  }

  if (type === 'interactive') {
    const buttonReply = message?.interactive?.button_reply
    const listReply = message?.interactive?.list_reply
    const replyText = buttonReply?.title || listReply?.title || listReply?.description || ""

    return {
      type: 'text',
      text: String(replyText || "").trim(),
      caption: null,
      mediaId: null,
      mimeType: null,
      fileName: null,
      contextMessageId
    }
  }

  if (type === 'button') {
    const replyText = message?.button?.text || message?.button?.payload || ""
    return {
      type: 'text',
      text: String(replyText || "").trim(),
      caption: null,
      mediaId: null,
      mimeType: null,
      fileName: null,
      contextMessageId
    }
  }

  if (type === 'image') {
    return {
      type: 'image',
      text: guessMessageText('image', null, message?.image?.caption),
      caption: message?.image?.caption || null,
      mediaId: message?.image?.id || null,
      mimeType: message?.image?.mime_type || null,
      fileName: null,
      contextMessageId
    }
  }

  if (type === 'video') {
    return {
      type: 'video',
      text: guessMessageText('video', null, message?.video?.caption),
      caption: message?.video?.caption || null,
      mediaId: message?.video?.id || null,
      mimeType: message?.video?.mime_type || null,
      fileName: null,
      contextMessageId
    }
  }

  if (type === 'audio') {
    return {
      type: message?.audio?.voice ? 'ptt' : 'audio',
      text: guessMessageText('audio'),
      caption: null,
      mediaId: message?.audio?.id || null,
      mimeType: message?.audio?.mime_type || null,
      fileName: null,
      contextMessageId
    }
  }

  if (type === 'document') {
    return {
      type: 'document',
      text: guessMessageText('document', null, message?.document?.caption),
      caption: message?.document?.caption || null,
      mediaId: message?.document?.id || null,
      mimeType: message?.document?.mime_type || null,
      fileName: message?.document?.filename || null,
      contextMessageId
    }
  }

  if (type === 'sticker') {
    return {
      type: 'sticker',
      text: '🟩 Figurinha',
      caption: null,
      mediaId: message?.sticker?.id || null,
      mimeType: message?.sticker?.mime_type || null,
      fileName: null,
      contextMessageId
    }
  }

  return {
    type,
    text: 'Mensagem não suportada',
    caption: null,
    mediaId: null,
    mimeType: null,
    fileName: null,
    contextMessageId
  }
}
