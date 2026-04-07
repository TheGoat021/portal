// app/api/whatsapp-meta/send-media/route.ts

import { NextRequest, NextResponse } from 'next/server'
import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { getMetaConnectionById, insertMetaMessage, touchMetaConversation } from '@/lib/metaDb'
import { uploadMetaInboundMedia } from '@/lib/metaStorage'
import { guessMessageText, normalizePhone, sendMediaMessage, uploadMedia } from '@/lib/whatsappMeta'

export const runtime = 'nodejs'

async function convertAudioToOggOpus(fileBuffer: Buffer, originalName: string) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'meta-audio-'))
  const inputPath = path.join(tmpDir, originalName || `audio-${Date.now()}.tmp`)
  const outputPath = path.join(tmpDir, `${Date.now()}-audio.ogg`)

  await fs.writeFile(inputPath, fileBuffer)

  try {
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .audioCodec('libopus')
        .audioChannels(1)
        .audioFrequency(48000)
        .format('ogg')
        .save(outputPath)
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
    })

    const convertedBuffer = await fs.readFile(outputPath)
    return {
      buffer: convertedBuffer,
      mimeType: 'audio/ogg; codecs=opus',
      fileName: `audio_${Date.now()}.ogg`
    }
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

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

    const inputBuffer = Buffer.from(await file.arrayBuffer())
    let fileBuffer = inputBuffer
    let fileMimeType = file.type || 'application/octet-stream'
    let fileName = file.name || 'arquivo'

    if (type === 'audio') {
      const converted = await convertAudioToOggOpus(fileBuffer, fileName)
      fileBuffer = converted.buffer
      fileMimeType = converted.mimeType
      fileName = converted.fileName
    }

    const upload = await uploadMedia({
      phoneNumberId: connection.phone_number_id,
      token: connection.business_token,
      file: fileBuffer,
      fileName,
      mimeType: fileMimeType
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
      fileName,
      replyToMessageId: replyToMessageId || null
    })

    const metaMessageId = result?.messages?.[0]?.id || null
    if (!metaMessageId) {
      throw new Error(`Meta não retornou message id para envio de mídia: ${JSON.stringify(result)}`)
    }
    const previewText = guessMessageText(type, null, caption || null)

    let mediaUrl: string | null = null
    let sha256: string | null = null

    try {
      const uploaded = await uploadMetaInboundMedia({
        fileBuffer,
        mimeType: fileMimeType || null,
        connectionId: connection.id,
        waId: normalizePhone(to),
        mediaId
      })

      mediaUrl = uploaded.publicUrl
      sha256 = uploaded.sha256
    } catch (storageError) {
      console.error('Erro ao persistir mídia outbound no storage:', storageError)
    }

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
      mimeType: fileMimeType || null,
      mediaUrl,
      fileName,
      sha256,
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao enviar mídia'
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    )
  }
}

