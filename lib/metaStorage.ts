// lib/metaStorage.ts

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import crypto from 'crypto'

export function extensionFromMime(mimeType?: string | null) {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/ogg': 'ogg',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx'
  }

  return map[mimeType || ''] || 'bin'
}

export async function uploadMetaInboundMedia({
  fileBuffer,
  mimeType,
  connectionId,
  waId,
  mediaId
}: {
  fileBuffer: Buffer
  mimeType?: string | null
  connectionId: string
  waId: string
  mediaId: string
}) {
  const ext = extensionFromMime(mimeType)
  const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex')
  const filePath = `meta/${connectionId}/${waId}/${mediaId}-${hash.slice(0, 12)}.${ext}`

  const { error } = await supabaseAdmin.storage
    .from('whatsapp-media')
    .upload(filePath, fileBuffer, {
      contentType: mimeType || 'application/octet-stream',
      upsert: true
    })

  if (error) {
    throw new Error(error.message)
  }

  const { data } = supabaseAdmin.storage
    .from('whatsapp-media')
    .getPublicUrl(filePath)

  return {
    publicUrl: data.publicUrl,
    sha256: hash
  }
}