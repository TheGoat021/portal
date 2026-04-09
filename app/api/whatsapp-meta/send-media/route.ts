// app/api/whatsapp-meta/send-media/route.ts

import { NextRequest, NextResponse } from 'next/server'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import fsSync from 'fs'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getMetaConnectionById, insertMetaMessage, touchMetaConversation } from '@/lib/metaDb'
import { getMetaConversationManagement, upsertMetaConversationManagement } from '@/lib/metaConversationManagement'
import { uploadMetaInboundMedia } from '@/lib/metaStorage'
import { guessMessageText, normalizePhone, sendMediaMessage, uploadMedia } from '@/lib/whatsappMeta'

export const runtime = 'nodejs'

function detectAudioMimeFromBuffer(buffer: Buffer): string | null {
  if (buffer.length < 12) return null

  if (buffer.subarray(0, 4).toString('ascii') === 'OggS') {
    return 'audio/ogg'
  }

  if (buffer.subarray(0, 3).toString('ascii') === 'ID3') {
    return 'audio/mpeg'
  }

  const hasMp3FrameSync = buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0
  if (hasMp3FrameSync) {
    return 'audio/mpeg'
  }

  const hasAmrHeader = buffer.subarray(0, 6).toString('ascii') === '#!AMR\n'
  if (hasAmrHeader) {
    return 'audio/amr'
  }

  const hasMp4Ftyp = buffer.subarray(4, 8).toString('ascii') === 'ftyp'
  if (hasMp4Ftyp) {
    return 'audio/mp4'
  }

  const hasEbml = buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3
  if (hasEbml) {
    return 'audio/webm'
  }

  const hasAdtsSync = buffer[0] === 0xff && (buffer[1] & 0xf6) === 0xf0
  if (hasAdtsSync) {
    return 'audio/aac'
  }

  return null
}

async function convertAudioToOggOpus(fileBuffer: Buffer, originalName: string) {
  const fromPackage = typeof ffmpegStatic === 'string' ? ffmpegStatic : ''
  const candidates = [
    fromPackage,
    fromPackage.replace(/^\/root\//i, '/var/task/'),
    fromPackage.replace(/^\/ROOT\//, '/var/task/'),
    path.join(process.cwd(), 'node_modules', 'ffmpeg-static', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'),
    '/var/task/node_modules/ffmpeg-static/ffmpeg'
  ].filter(Boolean)

  const ffmpegPath = candidates.find((candidate) => fsSync.existsSync(candidate)) || ''

  if (!ffmpegPath) {
    throw new Error('ffmpeg-static não encontrado para conversão de áudio')
  }

  ffmpeg.setFfmpegPath(ffmpegPath)

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'meta-audio-'))
  const safeName = (originalName || `audio-${Date.now()}.tmp`).replace(/[^\w.\-]/g, '_')
  const inputPath = path.join(tmpDir, safeName)
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
    const agentId = String(form.get('agentId') || '')
    const agentEmail = String(form.get('agentEmail') || '')
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

    let fileBuffer = Buffer.from(await file.arrayBuffer())
    let fileMimeType = file.type || 'application/octet-stream'
    let fileName = file.name || 'arquivo'

    if (type === 'audio') {
      const detectedMime = detectAudioMimeFromBuffer(fileBuffer)
      const normalizedAudioMime = (detectedMime || fileMimeType || '').toLowerCase().split(';')[0].trim()
      const convertibleMimes = new Set([
        'audio/webm',
        'audio/ogg',
        'audio/mp4',
        'audio/mpeg',
        'audio/aac',
        'audio/amr'
      ])

      if (!convertibleMimes.has(normalizedAudioMime)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              `Formato de áudio não suportado: ${fileMimeType || normalizedAudioMime || 'desconhecido'}. ` +
              'Use webm/ogg/m4a/mp3/aac/amr.'
          },
          { status: 400 }
        )
      }

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
        send: result,
        agentId: agentId || null,
        agentEmail: agentEmail || null
      },
      contextMessageId: replyToMessageId || null
    })

    await touchMetaConversation({
      conversationId,
      lastMessage: previewText,
      lastMessageType: type
    })

    if (agentId && agentEmail) {
      const [currentManagement, profileResult] = await Promise.all([
        getMetaConversationManagement(conversationId),
        supabaseAdmin
          .from("profiles")
          .select("role")
          .eq("id", agentId)
          .maybeSingle()
      ])

      if (!currentManagement?.assigned_user_id) {
        await upsertMetaConversationManagement({
          conversation_id: conversationId,
          connection_id: connection.id,
          status: "open",
          assigned_user_id: agentId,
          assigned_user_email: agentEmail,
          assigned_department: profileResult.data?.role ? String(profileResult.data.role) : null,
          closed_at: null,
          closed_by_user_id: null
        })
      }
    }

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

