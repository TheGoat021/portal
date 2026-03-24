// app/api/whatsapp-meta/send-media/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getMetaConnectionById, insertMetaMessage, touchMetaConversation } from '@/lib/metaDb'
import { guessMessageText, normalizePhone, sendMediaMessage, uploadMedia } from '@/lib/whatsappMeta'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()

    const connectionId = String(form.get('connectionId') || '')
    const conversationId = String(form.get('conversationId') || '')
    const to = String(form.get('to') || '')
    const type = String(form.get('type') || '') as 'image' | 'video' | 'audio' | 'document'
    const caption = String(form.get('caption') || '')
    const replyToMessageId = String(form.get('replyToMessageId') || '')
    const file = form.get('file') as File | null

    if (!connectionId) {
      return NextResponse.json({ error: 'connectionId é obrigatório' }, { status: 400 })
    }

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId é obrigatório' }, { status: 400 })
    }

    if (!to) {
      return NextResponse.json({ error: 'to é obrigatório' }, { status: 400 })
    }

    if (!type || !['image', 'video', 'audio', 'document'].includes(type)) {
      return NextResponse.json({ error: 'type inválido' }, { status: 400 })
    }

    if (!file) {
      return NextResponse.json({ error: 'file é obrigatório' }, { status: 400 })
    }

    const connection = await getMetaConnectionById(connectionId)

    if (!connection?.phone_number_id || !connection?.business_token) {
      return NextResponse.json({ error: 'Conexão Meta inválida' }, { status: 400 })
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer())

    const upload = await uploadMedia({
      phoneNumberId: connection.phone_number_id,
      token: connection.business_token,
      file: fileBuffer,
      fileName: file.name || 'arquivo',
      mimeType: file.type || 'application/octet-stream'
    })

    const mediaId = upload?.id

    if (!mediaId) {
      throw new Error('Media ID não retornado pela Meta')
    }

    const result = await sendMediaMessage({
      phoneNumberId: connection.phone_number_id,
      token: connection.business_token,
      to: normalizePhone(to),
      mediaId,
      type,
      caption: caption || null,
      fileName: file.name || null,
      replyToMessageId: replyToMessageId || null
    })

    const metaMessageId = result?.messages?.[0]?.id || null
    const previewText = guessMessageText(type, null, caption || null)

    const saved = await insertMetaMessage({
      conversationId,
      connectionId: connection.id,
      companyId: connection.company_id,
      metaMessageId,
      direction: 'outbound',
      status: 'sent',
      fromPhone: connection.display_phone_number,
      toPhone: to,
      type,
      message: previewText,
      caption: caption || null,
      mediaId,
      mimeType: file.type || null,
      fileName: file.name || null,
      rawPayload: {
        upload,
        send: result
      },
      contextMessageId: replyToMessageId || null
    })

    await touchMetaConversation({
      conversationId,
      lastMessage: previewText,
      lastMessageType: type
    })

    return NextResponse.json({
      ok: true,
      message: saved,
      meta: result
    })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao enviar mídia' },
      { status: 500 }
    )
  }
}