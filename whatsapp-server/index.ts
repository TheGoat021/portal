console.log("SUPABASE URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log("SERVICE KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY)

import express, { Request, Response } from "express"
import cors from "cors"
import makeWASocket, {
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  DisconnectReason,
  WASocket,
  BaileysEventMap,
  downloadMediaMessage,
  getContentType,
  normalizeMessageContent,
  proto
} from "@whiskeysockets/baileys"
import { Boom } from "@hapi/boom"
import { supabaseAdmin } from "../lib/supabaseAdmin"
import fs from "fs"
import path from "path"
import multer from "multer"
import ffmpeg from "fluent-ffmpeg"

const upload = multer({
  dest: "temp/"
})

const app = express()

app.set("trust proxy", true)

app.use(cors())
app.use(express.json())

const uploadsDir = path.join(process.cwd(), "uploads")
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir)
}

const PUBLIC_BASE_URL = String(
  process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_PUBLIC_BASE_URL || ""
).replace(/\/$/, "")

function getBaseUrl(req?: Request) {
  if (PUBLIC_BASE_URL) return PUBLIC_BASE_URL

  if (req) {
    const requestProto =
      (req.headers["x-forwarded-proto"] as string) || req.protocol || "http"
    const host =
      (req.headers["x-forwarded-host"] as string) || (req.get("host") as string | undefined)

    if (host) return `${requestProto}://${host}`
  }

  return "http://localhost:4000"
}

function publicUploadUrl(fileName: string, req?: Request) {
  const base = getBaseUrl(req)
  return `${base}/uploads/${encodeURIComponent(fileName)}`
}

app.use("/uploads", express.static(uploadsDir))

let latestQR: string | null = null
let sock: WASocket | null = null
let isConnected = false
let manuallyDisconnected = false

function normRole(input: unknown) {
  return String(input ?? "").trim().toLowerCase()
}

function isPrivilegedRole(role: unknown) {
  const r = normRole(role)
  return r === "admin" || r === "diretoria"
}

function extractBestPhone(message: BaileysMessageLike) {
  const keyAny = message.key as any
  const msgAny = message.message as any

  const candidates = [
    keyAny?.participantPn,
    keyAny?.remoteJidAlt,
    keyAny?.participantAlt,
    keyAny?.remoteJid,
    keyAny?.participant,
    msgAny?.extendedTextMessage?.contextInfo?.participant,
    msgAny?.extendedTextMessage?.contextInfo?.remoteJid,
    msgAny?.imageMessage?.contextInfo?.participant,
    msgAny?.videoMessage?.contextInfo?.participant,
    msgAny?.documentMessage?.contextInfo?.participant
  ]

  for (const candidate of candidates) {
    const phone = extractPhoneFromJid(candidate)
    if (phone) return phone
  }

  console.log("⚠️ Nenhum telefone real encontrado. Candidates:", candidates)

  return null
}

type BaileysMessageLike = proto.IWebMessageInfo & {
  key: NonNullable<proto.IWebMessageInfo["key"]>
}

function extractPhoneFromJid(jid?: string | null) {
  if (!jid) return null

  const lower = jid.toLowerCase()

  if (
    lower.includes("@lid") ||
    lower.includes("@g.us") ||
    lower.includes("status@broadcast") ||
    lower.includes("@broadcast")
  ) {
    return null
  }

  const value = jid.split("@")[0] || null
  if (!value) return null

  const digits = value.replace(/\D/g, "")

  if (digits.length >= 10 && digits.length <= 15) {
    return digits
  }

  return null
}

function isStatusBroadcast(jid?: string | null) {
  return !!jid && jid.includes("status@broadcast")
}

function getMessageText(msg: any): string {
  if (!msg) return ""

  return (
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    msg.documentMessage?.caption ||
    msg.buttonsResponseMessage?.selectedDisplayText ||
    msg.listResponseMessage?.title ||
    msg.listResponseMessage?.singleSelectReply?.selectedRowId ||
    msg.templateButtonReplyMessage?.selectedDisplayText ||
    msg.templateButtonReplyMessage?.selectedId ||
    msg.interactiveResponseMessage?.body?.text ||
    ""
  )
}

async function saveBufferToUploads(
  buffer: Buffer,
  prefix: string,
  extension: string,
  req?: Request
) {
  const safeExt = extension.replace(/^\./, "") || "bin"
  const fileName = `${prefix}_${Date.now()}.${safeExt}`
  const filePath = path.join(uploadsDir, fileName)

  fs.writeFileSync(filePath, buffer)

  return {
    fileName,
    filePath,
    publicUrl: publicUploadUrl(fileName, req)
  }
}

type ParsedMessage = {
  type: string
  rawType: string | null
  text: string
  mediaUrl: string | null
  quotedMessage: string | null
  quotedWhatsappMessageId: string | null
}

async function parseInboundMessage(
  message: BaileysMessageLike,
  req?: Request
): Promise<ParsedMessage> {
  const normalized = normalizeMessageContent(message.message)
  const contentType = normalized ? getContentType(normalized) : undefined
  const rawType = contentType ? String(contentType) : null

  const ext = normalized?.extendedTextMessage
  const quotedMessage =
    ext?.contextInfo?.quotedMessage?.conversation ||
    ext?.contextInfo?.quotedMessage?.extendedTextMessage?.text ||
    ext?.contextInfo?.quotedMessage?.imageMessage?.caption ||
    ext?.contextInfo?.quotedMessage?.videoMessage?.caption ||
    ext?.contextInfo?.quotedMessage?.documentMessage?.caption ||
    ext?.contextInfo?.quotedMessage?.documentMessage?.fileName ||
    null

  const quotedWhatsappMessageId = ext?.contextInfo?.stanzaId || null

  if (!normalized) {
    return {
      type: "unknown",
      rawType: null,
      text: "[Mensagem não suportada]",
      mediaUrl: null,
      quotedMessage: null,
      quotedWhatsappMessageId: null
    }
  }

  if (normalized.conversation) {
    return {
      type: "text",
      rawType,
      text: normalized.conversation,
      mediaUrl: null,
      quotedMessage: null,
      quotedWhatsappMessageId: null
    }
  }

  if (normalized.extendedTextMessage) {
    return {
      type: normalized.extendedTextMessage.contextInfo?.quotedMessage ? "reply" : "text",
      rawType,
      text: normalized.extendedTextMessage.text || "",
      mediaUrl: null,
      quotedMessage,
      quotedWhatsappMessageId
    }
  }

  if (normalized.stickerMessage) {
    return {
      type: "sticker",
      rawType,
      text: "🟩 Figurinha",
      mediaUrl: null,
      quotedMessage: null,
      quotedWhatsappMessageId: null
    }
  }

  if (normalized.imageMessage) {
    const buffer = (await downloadMediaMessage(message as any, "buffer", {})) as Buffer
    const saved = await saveBufferToUploads(buffer, "img", "jpg", req)

    return {
      type: "image",
      rawType,
      text: normalized.imageMessage.caption || "📷 Imagem",
      mediaUrl: saved.publicUrl,
      quotedMessage: null,
      quotedWhatsappMessageId: null
    }
  }

  if (normalized.videoMessage) {
    const buffer = (await downloadMediaMessage(message as any, "buffer", {})) as Buffer
    const saved = await saveBufferToUploads(buffer, "video", "mp4", req)

    return {
      type: "video",
      rawType,
      text: normalized.videoMessage.caption || "🎥 Vídeo",
      mediaUrl: saved.publicUrl,
      quotedMessage: null,
      quotedWhatsappMessageId: null
    }
  }

  if (normalized.audioMessage) {
    const buffer = (await downloadMediaMessage(message as any, "buffer", {})) as Buffer
    const saved = await saveBufferToUploads(buffer, "audio", "ogg", req)

    return {
      type: normalized.audioMessage.ptt ? "ptt" : "audio",
      rawType,
      text: normalized.audioMessage.ptt ? "🎤 Áudio" : "🔊 Áudio",
      mediaUrl: saved.publicUrl,
      quotedMessage: null,
      quotedWhatsappMessageId: null
    }
  }

  if (normalized.documentMessage) {
    const buffer = (await downloadMediaMessage(message as any, "buffer", {})) as Buffer
    const fileNameOriginal = normalized.documentMessage.fileName || "documento"
    const extension = fileNameOriginal.split(".").pop() || "file"
    const saved = await saveBufferToUploads(buffer, "doc", extension, req)

    return {
      type: "document",
      rawType,
      text: fileNameOriginal,
      mediaUrl: saved.publicUrl,
      quotedMessage: null,
      quotedWhatsappMessageId: null
    }
  }

  if (normalized.contactMessage) {
    return {
      type: "contact",
      rawType,
      text: normalized.contactMessage.displayName || "👤 Contato",
      mediaUrl: null,
      quotedMessage: null,
      quotedWhatsappMessageId: null
    }
  }

  if (normalized.locationMessage) {
    return {
      type: "location",
      rawType,
      text: "📍 Localização",
      mediaUrl: null,
      quotedMessage: null,
      quotedWhatsappMessageId: null
    }
  }

  if ((normalized as any).buttonsResponseMessage) {
    const btn = (normalized as any).buttonsResponseMessage
    return {
      type: "button_response",
      rawType,
      text: btn.selectedDisplayText || btn.selectedButtonId || "[Resposta de botão]",
      mediaUrl: null,
      quotedMessage: null,
      quotedWhatsappMessageId: null
    }
  }

  if ((normalized as any).listResponseMessage) {
    const list = (normalized as any).listResponseMessage
    return {
      type: "list_response",
      rawType,
      text: list.title || list.singleSelectReply?.selectedRowId || "[Resposta de lista]",
      mediaUrl: null,
      quotedMessage: null,
      quotedWhatsappMessageId: null
    }
  }

  if ((normalized as any).templateButtonReplyMessage) {
    const t = (normalized as any).templateButtonReplyMessage
    return {
      type: "template_button_reply",
      rawType,
      text: t.selectedDisplayText || t.selectedId || "[Resposta de template]",
      mediaUrl: null,
      quotedMessage: null,
      quotedWhatsappMessageId: null
    }
  }

  if ((normalized as any).interactiveResponseMessage) {
    const interactive = (normalized as any).interactiveResponseMessage
    return {
      type: "interactive_response",
      rawType,
      text:
        interactive?.body?.text ||
        interactive?.nativeFlowResponseMessage?.name ||
        "[Resposta interativa]",
      mediaUrl: null,
      quotedMessage: null,
      quotedWhatsappMessageId: null
    }
  }

  return {
    type: "unknown",
    rawType,
    text: getMessageText(normalized) || "[Mensagem não suportada]",
    mediaUrl: null,
    quotedMessage,
    quotedWhatsappMessageId
  }
}

async function upsertConversationByPhone(
  phone: string,
  lastMessage: string,
  lastMessageType: string
) {
  const { data: existingConversation, error: existingConversationError } = await supabaseAdmin
    .from("conversations")
    .select("*")
    .eq("phone", phone)
    .maybeSingle()

  if (existingConversationError) {
    throw existingConversationError
  }

  let conversationId = existingConversation?.id

  if (!existingConversation) {
    const { data: newConversation, error } = await supabaseAdmin
      .from("conversations")
      .insert({
        phone,
        last_message: lastMessage,
        last_message_at: new Date(),
        last_message_type: lastMessageType,
        agent_id: null,
        locked_at: null
      })
      .select()
      .single()

    if (error) throw error
    conversationId = newConversation.id
  } else {
    const { error } = await supabaseAdmin
      .from("conversations")
      .update({
        last_message: lastMessage,
        last_message_at: new Date(),
        last_message_type: lastMessageType
      })
      .eq("id", conversationId)

    if (error) throw error
  }

  return conversationId
}

async function syncConversationPreviewByMessageId(
  whatsappMessageId: string,
  previewText: string,
  previewType: string
) {
  try {
    const { data: messageRow, error: messageError } = await supabaseAdmin
      .from("messages")
      .select("conversation_id, created_at")
      .eq("whatsapp_message_id", whatsappMessageId)
      .maybeSingle()

    if (messageError || !messageRow?.conversation_id) return

    const { data: conversation, error: conversationError } = await supabaseAdmin
      .from("conversations")
      .select("id, last_message_at")
      .eq("id", messageRow.conversation_id)
      .maybeSingle()

    if (conversationError || !conversation?.id) return

    const messageTs = new Date(messageRow.created_at).getTime()
    const conversationTs = conversation.last_message_at
      ? new Date(conversation.last_message_at).getTime()
      : 0

    if (messageTs >= conversationTs) {
      await supabaseAdmin
        .from("conversations")
        .update({
          last_message: previewText,
          last_message_type: previewType
        })
        .eq("id", conversation.id)
    }
  } catch (error) {
    console.error("Erro ao sincronizar preview da conversa:", error)
  }
}

async function resetSession() {
  try {
    if (sock) {
      await sock.logout()
      sock = null
    }

    const authPath = path.join(process.cwd(), "auth_info")

    if (fs.existsSync(authPath)) {
      fs.rmSync(authPath, { recursive: true, force: true })
      console.log("🗑️ auth_info removido")
    }

    latestQR = null
    isConnected = false
  } catch (err) {
    console.error("Erro ao resetar sessão:", err)
  }
}

async function startWhatsApp() {
  if (sock) return

  manuallyDisconnected = false

  const { version } = await fetchLatestBaileysVersion()
  console.log("Using WA version:", version)

  const { state, saveCreds } = await useMultiFileAuthState("auth_info")

  sock = makeWASocket({
    version,
    auth: state
  })

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      latestQR = qr
      console.log("📲 QR atualizado")
    }

    if (connection === "open") {
      latestQR = null
      isConnected = true
      console.log("✅ WhatsApp conectado")
    }

    if (connection === "close") {
      isConnected = false
      sock = null

      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
      const shouldReconnect =
        statusCode !== DisconnectReason.loggedOut && !manuallyDisconnected

      console.log("❌ Conexão fechada. Reconectar?", shouldReconnect)

      if (shouldReconnect) {
        setTimeout(() => startWhatsApp(), 3000)
      }
    }
  })

  sock.ev.on("messages.upsert", async (event: BaileysEventMap["messages.upsert"]) => {
    try {
      console.log("📥 messages.upsert:", {
        type: (event as any)?.type,
        count: event.messages?.length || 0
      })

      for (const message of event.messages) {
        try {
          if (!message?.message || !message?.key) {
            console.log("⚠️ Mensagem sem conteúdo ou key, ignorada")
            continue
          }

          const from = message.key.remoteJid || null
          const isFromMe = !!message.key.fromMe

          console.log("🔎 Mensagem recebida:", {
            remoteJid: from,
            fromMe: isFromMe,
            messageId: message.key.id
          })

          if (!from || isStatusBroadcast(from)) {
            console.log("⚠️ Ignorada por ser status/broadcast ou sem remoteJid:", from)
            continue
          }

          if (isFromMe) {
            console.log("⚠️ Ignorada por ser fromMe")
            continue
          }

          const rawMessage = message.message as any

          if (rawMessage?.protocolMessage || rawMessage?.senderKeyDistributionMessage) {
            console.log("⚠️ Ignorada por ser protocol/senderKeyDistribution")
            continue
          }

          const phone = extractBestPhone(message as BaileysMessageLike)

          if (!phone) {
            console.log("❌ Não foi possível extrair telefone:", {
              remoteJid: message.key.remoteJid,
              participant: message.key.participant,
              key: message.key
            })
            continue
          }

          const parsed = await parseInboundMessage(message as BaileysMessageLike)

          console.log("📩 Parsed inbound:", {
            phone,
            type: parsed.type,
            rawType: parsed.rawType,
            text: parsed.text,
            mediaUrl: parsed.mediaUrl
          })

          if (!parsed.text && !parsed.mediaUrl) {
            console.log("⚠️ Ignorada porque parsed veio vazio")
            continue
          }

          const conversationId = await upsertConversationByPhone(
            phone,
            parsed.text || "",
            parsed.type
          )

          console.log("🧩 conversationId encontrado/criado:", conversationId)

          const { error } = await supabaseAdmin.from("messages").insert({
            conversation_id: conversationId,
            phone,
            direction: "inbound",
            message: parsed.text || "",
            type: parsed.type,
            raw_type: parsed.rawType,
            media_url: parsed.mediaUrl,
            quoted_message: parsed.quotedMessage,
            quoted_whatsapp_message_id: parsed.quotedWhatsappMessageId,
            whatsapp_message_id: message.key.id || null,
            status: null,
            created_at: new Date(
              message.messageTimestamp
                ? Number(message.messageTimestamp) * 1000
                : Date.now()
            )
          })

          if (error) {
            console.error("❌ Erro ao salvar inbound:", error)
          } else {
            console.log("💾 Mensagem inbound salva no Supabase")
          }
        } catch (innerError) {
          console.error("❌ Erro processando mensagem inbound individual:", innerError)
        }
      }
    } catch (error) {
      console.error("Erro no messages.upsert:", error)
    }
  })

  sock.ev.on("messages.update", async (updates: any[]) => {
    try {
      for (const update of updates) {
        const key = update?.key
        const updateMessage = update?.update

        if (!key?.id) continue

        const protocolMessage = updateMessage?.message?.protocolMessage
        const editedMessage = updateMessage?.message?.editedMessage

        if (protocolMessage?.type === 0) {
          const { error } = await supabaseAdmin
            .from("messages")
            .update({
              message: "🚫 Mensagem apagada",
              type: "revoked",
              deleted_at: new Date()
            })
            .eq("whatsapp_message_id", key.id)

          if (error) {
            console.error("Erro ao marcar mensagem apagada:", error)
          } else {
            console.log("🗑️ Mensagem apagada atualizada:", key.id)
            await syncConversationPreviewByMessageId(
              key.id,
              "🚫 Mensagem apagada",
              "revoked"
            )
          }

          continue
        }

        if (editedMessage) {
          const editedText = getMessageText(editedMessage) || "✏️ Mensagem editada"

          const { error } = await supabaseAdmin
            .from("messages")
            .update({
              message: editedText,
              type: "edited",
              edited_at: new Date()
            })
            .eq("whatsapp_message_id", key.id)

          if (error) {
            console.error("Erro ao atualizar mensagem editada:", error)
          } else {
            console.log("✏️ Mensagem editada atualizada:", key.id)
            await syncConversationPreviewByMessageId(key.id, editedText, "edited")
          }

          continue
        }

        const statusValue = updateMessage?.status
        if (statusValue != null) {
          let mappedStatus: "sent" | "delivered" | "read" = "sent"

          if (Number(statusValue) >= 2) mappedStatus = "delivered"
          if (Number(statusValue) >= 3) mappedStatus = "read"

          const { error } = await supabaseAdmin
            .from("messages")
            .update({ status: mappedStatus })
            .eq("whatsapp_message_id", key.id)

          if (error) {
            console.error("Erro ao atualizar status via messages.update:", error)
          }
        }
      }
    } catch (error) {
      console.error("Erro no messages.update:", error)
    }
  })

  sock.ev.on("message-receipt.update", async (updates: any[]) => {
    try {
      for (const item of updates) {
        const key = item?.key
        if (!key?.id) continue

        let status: "sent" | "delivered" | "read" = "sent"

        const receipts = item?.receipt || []
        const receiptList = Array.isArray(receipts) ? receipts : [receipts]

        const hasRead = receiptList.some((r: any) => Number(r?.readTimestamp || 0) > 0)
        const hasDelivered = receiptList.some(
          (r: any) =>
            Number(r?.receiptTimestamp || 0) > 0 ||
            Number(r?.deliveryTimestamp || 0) > 0
        )

        if (hasRead) status = "read"
        else if (hasDelivered) status = "delivered"

        const { error } = await supabaseAdmin
          .from("messages")
          .update({ status })
          .eq("whatsapp_message_id", key.id)

        if (error) {
          console.error("Erro ao atualizar receipt:", error)
        }
      }
    } catch (error) {
      console.error("Erro no message-receipt.update:", error)
    }
  })
}

/**
 * GET QR
 */
app.get("/qr", (_req: Request, res: Response) => {
  res.json({
    qr: latestQR,
    connected: isConnected
  })
})

/**
 * GET Status
 */
app.get("/status", (_req: Request, res: Response) => {
  res.json({
    connected: isConnected
  })
})

/**
 * GET Conversations
 */
app.get("/conversations", async (req: Request, res: Response) => {
  try {
    const userId = String(req.query.userId ?? "")
    const role = normRole(req.query.role)

    if (isPrivilegedRole(role)) {
      const { data, error } = await supabaseAdmin
        .from("conversations")
        .select("*")
        .order("last_message_at", { ascending: false })

      if (error) return res.status(500).json({ error: error.message })
      return res.json(data ?? [])
    }

    if (!userId) {
      return res.status(400).json({ error: "userId é obrigatório" })
    }

    const { data, error } = await supabaseAdmin
      .from("conversations")
      .select("*")
      .eq("agent_id", userId)
      .order("last_message_at", { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    res.json(data ?? [])
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar conversas" })
  }
})

app.get("/conversations/unassigned", async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("conversations")
      .select("*")
      .is("agent_id", null)
      .order("last_message_at", { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    res.json(data ?? [])
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar conversas não atribuídas" })
  }
})

app.get("/conversations/by-agent/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params

    const { data, error } = await supabaseAdmin
      .from("conversations")
      .select("*")
      .eq("agent_id", userId)
      .order("last_message_at", { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    res.json(data ?? [])
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar conversas do agente" })
  }
})

app.post("/conversations/:id/lock", async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { userId, role: roleBody } = req.body as { userId?: string; role?: string }

    if (!userId) return res.status(400).json({ error: "userId é obrigatório" })

    const roleHeader = req.headers["x-user-role"]
    const role = normRole(roleBody ?? roleHeader)

    if (isPrivilegedRole(role)) {
      return res.json({ success: true, skipped: true })
    }

    const { data, error } = await supabaseAdmin
      .from("conversations")
      .update({ agent_id: userId, locked_at: new Date() })
      .eq("id", id)
      .or(`agent_id.is.null,agent_id.eq.${userId}`)
      .select("id,agent_id")
      .maybeSingle()

    if (error) return res.status(500).json({ error: error.message })

    if (!data) {
      return res.status(403).json({ error: "Essa conversa já está sendo atendida" })
    }

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: "Erro ao bloquear conversa" })
  }
})

app.post("/conversations/:id/unlock", async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const role = normRole((req.body as any)?.role)

    if (role !== "admin") {
      return res.status(403).json({ error: "Apenas admin pode liberar conversa" })
    }

    await supabaseAdmin
      .from("conversations")
      .update({
        agent_id: null,
        locked_at: null
      })
      .eq("id", id)

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: "Erro ao liberar conversa" })
  }
})

app.get("/agents", async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers()

    if (error) return res.status(500).json({ error: error.message })

    const mapped =
      (data.users ?? []).map((u) => ({
        id: String(u.id),
        email: String(u.email ?? ""),
        role: "agent"
      })) || []

    res.json(mapped)
  } catch (error) {
    console.error("Erro ao buscar agents:", error)
    res.status(500).json({ error: "Erro ao buscar atendentes" })
  }
})

app.post("/conversations/:id/transfer", async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { toUserId } = req.body as { toUserId?: string }

    if (!toUserId) return res.status(400).json({ error: "toUserId é obrigatório" })

    const { data: conv, error: convError } = await supabaseAdmin
      .from("conversations")
      .select("id")
      .eq("id", id)
      .single()

    if (convError || !conv) {
      return res.status(404).json({ error: "Conversa não encontrada" })
    }

    const { data: userData, error: userError } =
      await supabaseAdmin.auth.admin.getUserById(toUserId)

    if (userError || !userData?.user) {
      return res.status(404).json({ error: "Atendente não encontrado" })
    }

    const { error: upError } = await supabaseAdmin
      .from("conversations")
      .update({
        agent_id: toUserId,
        locked_at: new Date()
      })
      .eq("id", id)

    if (upError) return res.status(500).json({ error: upError.message })

    res.json({ success: true })
  } catch (error) {
    console.error("Erro ao transferir conversa:", error)
    res.status(500).json({ error: "Erro ao transferir conversa" })
  }
})

/**
 * GET Messages
 */
app.get("/messages/:conversationId", async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params

    const { data, error } = await supabaseAdmin
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("❌ Supabase error:", error)
      return res.status(500).json({ error: error.message })
    }

    res.json(data ?? [])
  } catch (error) {
    console.error("❌ Erro ao buscar mensagens:", error)
    res.status(500).json({ error: "Erro ao buscar mensagens" })
  }
})

app.put("/conversations/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, email } = req.body

    if (!id) {
      return res.status(400).json({ error: "ID da conversa é obrigatório" })
    }

    console.log("🔎 Atualizando conversa:", {
      id,
      body: req.body
    })

    const payload: Record<string, any> = {}

    if (name !== undefined) payload.name = name
    if (email !== undefined) payload.email = email

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        error: "Nenhum campo válido enviado para atualização"
      })
    }

    const { error: updateError } = await supabaseAdmin
      .from("conversations")
      .update(payload)
      .eq("id", id)

    if (updateError) {
      console.error("❌ Supabase update error:", updateError)
      return res.status(500).json({ error: updateError.message })
    }

    const { data: updatedConversation, error: fetchError } = await supabaseAdmin
      .from("conversations")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (fetchError) {
      console.error("❌ Supabase fetch error:", fetchError)
      return res.status(500).json({ error: fetchError.message })
    }

    if (!updatedConversation) {
      return res.status(404).json({ error: "Conversa não encontrada" })
    }

    return res.json(updatedConversation)
  } catch (error) {
    console.error("Erro ao atualizar cliente:", error)
    return res.status(500).json({ error: "Erro ao atualizar cliente" })
  }
})

/**
 * POST Send Message
 */
app.post("/send", async (req: Request, res: Response) => {
  try {
    const {
      conversationId,
      phone,
      message,
      userId,
      agentId,
      role,
      agentEmail
    } = req.body as any

    const finalAgentId = userId || agentId || null

    if (!sock || !isConnected) {
      return res.status(400).json({ error: "WhatsApp não conectado" })
    }

    if (!message) {
      return res.status(400).json({ error: "message é obrigatório" })
    }

    let finalPhone: string | null = null

    if (conversationId) {
      const { data: conversation } = await supabaseAdmin
        .from("conversations")
        .select("phone")
        .eq("id", conversationId)
        .single()

      if (!conversation) {
        return res.status(404).json({ error: "Conversa não encontrada" })
      }

      finalPhone = conversation.phone
    }

    if (phone) {
      finalPhone = phone
    }

    if (!finalPhone) {
      return res.status(400).json({ error: "conversationId ou phone é obrigatório" })
    }

    const cleanPhone = String(finalPhone).replace(/\D/g, "")
    const jid = `${cleanPhone}@s.whatsapp.net`

    let conversationIdFinal = conversationId

    if (!conversationId && phone) {
      if (!finalAgentId) {
        return res.status(400).json({ error: "userId é obrigatório" })
      }

      const privileged = isPrivilegedRole(role)

      const insertPayload: any = {
        phone: cleanPhone,
        last_message: message,
        last_message_at: new Date(),
        last_message_type: "text"
      }

      if (!privileged) {
        insertPayload.agent_id = finalAgentId
        insertPayload.locked_at = new Date()
      }

      if (agentEmail) {
        insertPayload.agent_name = String(agentEmail)
      }

      const { data: newConversation, error } = await supabaseAdmin
        .from("conversations")
        .insert(insertPayload)
        .select()
        .single()

      if (error) return res.status(500).json({ error: error.message })

      conversationIdFinal = newConversation.id
    }

    console.log("📤 Enviando para:", jid)

    const sent = await sock.sendMessage(jid, { text: message })

    await supabaseAdmin.from("messages").insert({
      conversation_id: conversationIdFinal,
      phone: cleanPhone,
      direction: "outbound",
      message,
      type: "text",
      raw_type: "conversation",
      whatsapp_message_id: sent?.key?.id || null,
      status: "sent",
      agent_id: finalAgentId,
      agent_name: agentEmail || null,
      created_at: new Date()
    })

    const conversationUpdatePayload: any = {
      last_message: message,
      last_message_at: new Date(),
      last_message_type: "text"
    }

    if (agentEmail) {
      conversationUpdatePayload.agent_name = String(agentEmail)
    }

    await supabaseAdmin
      .from("conversations")
      .update(conversationUpdatePayload)
      .eq("id", conversationIdFinal)

    res.json({
      success: true,
      whatsapp_message_id: sent?.key?.id || null,
      status: "sent"
    })
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error)
    res.status(500).json({ error: "Erro ao enviar mensagem" })
  }
})

/**
 * POST Send Media
 */
app.post(
  "/send-media",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const { conversationId, userId, agentId, agentEmail } = req.body as any
      const finalAgentId = userId || agentId || null
      const file = req.file

      if (!sock || !isConnected) {
        return res.status(400).json({ error: "WhatsApp não conectado" })
      }

      if (!file) {
        return res.status(400).json({ error: "Arquivo é obrigatório" })
      }

      const { data: conversation } = await supabaseAdmin
        .from("conversations")
        .select("phone")
        .eq("id", conversationId)
        .single()

      if (!conversation) {
        return res.status(404).json({ error: "Conversa não encontrada" })
      }

      const cleanPhone = conversation.phone.replace(/\D/g, "")
      const jid = `${cleanPhone}@s.whatsapp.net`

      const fileBuffer = fs.readFileSync(file.path)

      let messageType: "image" | "audio" | "document" = "document"
      let sendPayload: any = {}
      let mediaUrl: string | null = null
      let textToStore = file.originalname

      if (file.mimetype.startsWith("image/")) {
        messageType = "image"
        sendPayload = { image: fileBuffer }

        const finalPath = path.join(
          uploadsDir,
          file.filename + path.extname(file.originalname)
        )

        fs.renameSync(file.path, finalPath)
        mediaUrl = publicUploadUrl(path.basename(finalPath), req)
        textToStore = "📷 Imagem"
      } else if (file.mimetype.startsWith("audio/")) {
        messageType = "audio"

        const inputPath = file.path
        const outputPath = `${file.path}.ogg`

        await new Promise<void>((resolve, reject) => {
          ffmpeg(inputPath)
            .audioCodec("libopus")
            .audioChannels(1)
            .audioFrequency(48000)
            .format("ogg")
            .save(outputPath)
            .on("end", () => resolve())
            .on("error", (err: any) => reject(err))
        })

        const convertedBuffer = fs.readFileSync(outputPath)

        sendPayload = {
          audio: convertedBuffer,
          mimetype: "audio/ogg; codecs=opus",
          ptt: true
        }

        const finalPath = path.join(uploadsDir, `audio_${Date.now()}.ogg`)
        fs.renameSync(outputPath, finalPath)

        mediaUrl = publicUploadUrl(path.basename(finalPath), req)

        fs.unlinkSync(inputPath)
        textToStore = "🎤 Áudio"
      } else {
        messageType = "document"

        sendPayload = {
          document: fileBuffer,
          fileName: file.originalname,
          mimetype: file.mimetype
        }

        const finalPath = path.join(
          uploadsDir,
          file.filename + path.extname(file.originalname)
        )

        fs.renameSync(file.path, finalPath)
        mediaUrl = publicUploadUrl(path.basename(finalPath), req)
        textToStore = file.originalname
      }

      const sent = await sock.sendMessage(jid, sendPayload)

      await supabaseAdmin.from("messages").insert({
        conversation_id: conversationId,
        phone: cleanPhone,
        direction: "outbound",
        message: textToStore,
        type: messageType,
        raw_type: messageType,
        media_url: mediaUrl,
        whatsapp_message_id: sent?.key?.id || null,
        status: "sent",
        agent_id: finalAgentId,
        agent_name: agentEmail || null,
        created_at: new Date()
      })

      const conversationUpdatePayload: any = {
        last_message: textToStore,
        last_message_at: new Date(),
        last_message_type: messageType
      }

      if (agentEmail) {
        conversationUpdatePayload.agent_name = String(agentEmail)
      }

      await supabaseAdmin
        .from("conversations")
        .update(conversationUpdatePayload)
        .eq("id", conversationId)

      res.json({
        success: true,
        whatsapp_message_id: sent?.key?.id || null,
        status: "sent"
      })
    } catch (error) {
      console.error("Erro ao enviar mídia:", error)
      res.status(500).json({ error: "Erro ao enviar mídia" })
    }
  }
)

app.post("/restart", async (_req: Request, res: Response) => {
  try {
    manuallyDisconnected = true
    await resetSession()
    manuallyDisconnected = false
    await startWhatsApp()
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: "Erro ao reiniciar WhatsApp" })
  }
})

app.post("/disconnect", async (_req: Request, res: Response) => {
  try {
    manuallyDisconnected = true
    await resetSession()
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: "Erro ao desconectar" })
  }
})

app.listen(4000, () => {
  console.log("🚀 WhatsApp Server rodando na porta 4000")
})

startWhatsApp()