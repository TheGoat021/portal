// lib/metaStorage.ts

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import crypto from 'crypto'

const DEFAULT_MEDIA_BUCKET = 'whatsapp-media'

function getMediaBucketName() {
  return process.env.WHATSAPP_MEDIA_BUCKET || DEFAULT_MEDIA_BUCKET
}

export function extensionFromMime(mimeType?: string | null) {
  const normalized = (mimeType || '').toLowerCase().split(';')[0].trim()

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

  return map[normalized] || 'bin'
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
  const bucketName = getMediaBucketName()
  const ext = extensionFromMime(mimeType)
  const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex')
  const filePath = `meta/${connectionId}/${waId}/${mediaId}-${hash.slice(0, 12)}.${ext}`

  let { error } = await supabaseAdmin.storage
    .from(bucketName)
    .upload(filePath, fileBuffer, {
      contentType: mimeType || 'application/octet-stream',
      upsert: true
    })

  if (error && /bucket not found/i.test(error.message)) {
    const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
      public: true
    })

    if (!createError) {
      const retry = await supabaseAdmin.storage
        .from(bucketName)
        .upload(filePath, fileBuffer, {
          contentType: mimeType || 'application/octet-stream',
          upsert: true
        })

      error = retry.error
    }
  }

  if (error) {
    throw new Error(error.message)
  }

  const { data } = supabaseAdmin.storage
    .from(bucketName)
    .getPublicUrl(filePath)

  return {
    publicUrl: data.publicUrl,
    sha256: hash
  }
}
