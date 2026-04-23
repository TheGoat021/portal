// lib/whatsappMeta.ts

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v23.0'
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`

export type MetaMediaType = 'image' | 'video' | 'audio' | 'document'
export type MetaSendType = 'text' | MetaMediaType

export function normalizePhone(phone?: string | null) {
  if (!phone) return ''
  return String(phone).replace(/\D/g, '')
}

export function guessMessageText(type: string, text?: string | null, caption?: string | null) {
  if (text?.trim()) return text.trim()
  if (caption?.trim()) return caption.trim()

  switch (type) {
    case 'image':
      return '📷 Imagem'
    case 'video':
      return '🎥 Vídeo'
    case 'audio':
      return '🎵 Áudio'
    case 'document':
      return '📄 Documento'
    case 'sticker':
      return '🟩 Figurinha'
    default:
      return 'Mensagem'
  }
}

export async function sendTextMessage({
  phoneNumberId,
  token,
  to,
  text,
  replyToMessageId
}: {
  phoneNumberId: string
  token: string
  to: string
  text: string
  replyToMessageId?: string | null
}) {
  const payload: any = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: {
      body: text
    }
  }

  if (replyToMessageId) {
    payload.context = { message_id: replyToMessageId }
  }

  const res = await fetch(`${GRAPH_BASE}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
    cache: 'no-store'
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data?.error?.message || 'Erro ao enviar mensagem de texto')
  }

  return data
}

export async function uploadMedia({
  phoneNumberId,
  token,
  file,
  fileName,
  mimeType
}: {
  phoneNumberId: string
  token: string
  file: Buffer
  fileName: string
  mimeType: string
}) {
  const form = new FormData()
  form.append("messaging_product", "whatsapp")

  const uint8 = new Uint8Array(file)

  form.append(
    "file",
    new Blob([uint8], { type: mimeType }),
    fileName
  )

  const res = await fetch(`${GRAPH_BASE}/${phoneNumberId}/media`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: form,
    cache: "no-store"
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data?.error?.message || "Erro ao subir mídia")
  }

  return data
}

export async function sendMediaMessage({
  phoneNumberId,
  token,
  to,
  mediaId,
  mediaLink,
  type,
  caption,
  fileName,
  replyToMessageId
}: {
  phoneNumberId: string
  token: string
  to: string
  mediaId?: string
  mediaLink?: string
  type: MetaMediaType
  caption?: string | null
  fileName?: string | null
  replyToMessageId?: string | null
}) {
  const payload: any = {
    messaging_product: 'whatsapp',
    to,
    type,
    [type]: {
      ...(mediaId ? { id: mediaId } : {}),
      ...(mediaLink ? { link: mediaLink } : {})
    }
  }

  if (!mediaId && !mediaLink) {
    throw new Error("mediaId ou mediaLink é obrigatório para enviar mídia")
  }

  if (caption && type !== 'audio') {
    payload[type].caption = caption
  }

  if (fileName && type === 'document') {
    payload[type].filename = fileName
  }

  if (replyToMessageId) {
    payload.context = { message_id: replyToMessageId }
  }

  const res = await fetch(`${GRAPH_BASE}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
    cache: 'no-store'
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data?.error?.message || 'Erro ao enviar mídia')
  }

  return data
}

export async function sendInteractiveButtonsMessage({
  phoneNumberId,
  token,
  to,
  bodyText,
  buttons,
  replyToMessageId
}: {
  phoneNumberId: string
  token: string
  to: string
  bodyText: string
  buttons: string[]
  replyToMessageId?: string | null
}) {
  const cleanButtons = buttons.map((item) => item.trim()).filter(Boolean).slice(0, 3)
  if (cleanButtons.length === 0) {
    throw new Error("Pelo menos um botão é obrigatório")
  }

  const payload: any = {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: bodyText?.trim() || "Escolha uma opção:"
      },
      action: {
        buttons: cleanButtons.map((label, index) => ({
          type: "reply",
          reply: {
            id: `opt_${index + 1}`,
            title: label.slice(0, 20)
          }
        }))
      }
    }
  }

  if (replyToMessageId) {
    payload.context = { message_id: replyToMessageId }
  }

  const res = await fetch(`${GRAPH_BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error?.message || "Erro ao enviar menu clicável")
  }

  return data
}

export async function getMediaInfo(mediaId: string, token: string) {
  const res = await fetch(`${GRAPH_BASE}/${mediaId}`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: 'no-store'
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data?.error?.message || 'Erro ao buscar mídia')
  }

  return data
}

export async function downloadMediaFile(url: string, token: string) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: 'no-store'
  })

  if (!res.ok) {
    throw new Error('Erro ao baixar mídia')
  }

  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export function extractWebhookEntries(payload: any) {
  return Array.isArray(payload?.entry) ? payload.entry : []
}
