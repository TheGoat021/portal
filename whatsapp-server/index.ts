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
  downloadMediaMessage
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
app.use(cors())
app.use(express.json())

// 🔥 GARANTE QUE A PASTA uploads EXISTA
const uploadsDir = path.join(process.cwd(), "uploads")
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir)
}

// 🔥 SERVIR ARQUIVOS DE MÍDIA
app.use("/uploads", express.static(uploadsDir))

let latestQR: string | null = null
let sock: WASocket | null = null
let isConnected = false
let manuallyDisconnected = false

function normRole(input: any) {
  return String(input ?? "").trim().toLowerCase()
}

function isPrivilegedRole(role: any) {
  const r = normRole(role)
  return r === "admin" || r === "diretoria"
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

  // 🔥 SALVA APENAS INBOUND (evita duplicação)
  sock.ev.on(
    "messages.upsert",
    async (event: BaileysEventMap["messages.upsert"]) => {
      const message = event.messages[0]
      if (!message?.message) return

      const from = message.key.remoteJid
      const fromAlt = (message.key as any).remoteJidAlt
      const isFromMe = message.key.fromMe

      if ((!from && !fromAlt) || (from && from.includes("status@broadcast")))
        return
      if (isFromMe) return

      let phone: string | null = null

      if (fromAlt) {
        phone = fromAlt.split("@")[0]
      } else if (from) {
        phone = from.split("@")[0]
      }

      if (!phone) return

      let text = ""
      let type = "text"
      let mediaUrl: string | null = null

      try {
        // 🔥 TEXTO
        if (message.message.conversation) {
          text = message.message.conversation
        } else if (message.message.extendedTextMessage?.text) {
          text = message.message.extendedTextMessage.text
        }

        // 🔥 IMAGEM
        else if (message.message.imageMessage) {
          type = "image"
          text = "📷 Imagem"

          const buffer = (await downloadMediaMessage(message, "buffer", {})) as Buffer

          const fileName = `img_${Date.now()}.jpg`
          const filePath = path.join(uploadsDir, fileName)

          fs.writeFileSync(filePath, buffer)
          mediaUrl = `http://localhost:4000/uploads/${fileName}`
        }

        // 🔥 ÁUDIO
        else if (message.message.audioMessage) {
          type = "audio"
          text = "🎤 Áudio"

          const buffer = (await downloadMediaMessage(message, "buffer", {})) as Buffer

          const fileName = `audio_${Date.now()}.ogg`
          const filePath = path.join(uploadsDir, fileName)

          fs.writeFileSync(filePath, buffer)
          mediaUrl = `http://localhost:4000/uploads/${fileName}`
        }

        // 🔥 DOCUMENTO
        else if (message.message.documentMessage) {
          type = "document"
          text = message.message.documentMessage.fileName || "📎 Documento"

          const buffer = (await downloadMediaMessage(message, "buffer", {})) as Buffer

          const extension =
            message.message.documentMessage.fileName?.split(".").pop() || "file"

          const fileName = `doc_${Date.now()}.${extension}`
          const filePath = path.join(uploadsDir, fileName)

          fs.writeFileSync(filePath, buffer)
          mediaUrl = `http://localhost:4000/uploads/${fileName}`
        }

        const { data: existingConversation } = await supabaseAdmin
          .from("conversations")
          .select("*")
          .eq("phone", phone)
          .maybeSingle()

        let conversationId = existingConversation?.id

        if (!existingConversation) {
          const { data: newConversation, error } = await supabaseAdmin
            .from("conversations")
            .insert({
              phone,
              last_message: text,
              last_message_at: new Date()
            })
            .select()
            .single()

          if (error) throw error
          conversationId = newConversation.id
        } else {
          await supabaseAdmin
            .from("conversations")
            .update({
              last_message: text,
              last_message_at: new Date()
            })
            .eq("id", conversationId)
        }

        await supabaseAdmin.from("messages").insert({
          conversation_id: conversationId,
          phone,
          direction: "inbound",
          message: text,
          type,
          media_url: mediaUrl,
          created_at: new Date()
        })

        console.log("💾 Mensagem inbound salva no Supabase")
      } catch (error) {
        console.error("Erro ao salvar mensagem:", error)
      }
    }
  )
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
 * GET Conversations (Admin/Diretoria vê todas | Atendente vê só as dele + livres)
 * Query params:
 * ?userId=uuid&role=admin|agent|diretoria
 */
app.get("/conversations", async (req: Request, res: Response) => {
  try {
    const userId = String(req.query.userId ?? "")
    const role = normRole(req.query.role)

    let query = supabaseAdmin
      .from("conversations")
      .select("*")
      .order("last_message_at", { ascending: false })

    // ✅ Admin e Diretoria veem tudo
    if (!isPrivilegedRole(role)) {
      if (!userId) {
        return res.status(400).json({ error: "userId é obrigatório" })
      }

      // ✅ Agent vê as dele + livres
      query = query.or(`agent_id.eq.${userId},agent_id.is.null`)
    }

    const { data, error } = await query

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.json(data ?? [])
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar conversas" })
  }
})

/**
 * GET Conversations não atribuídas
 */
app.get("/conversations/unassigned", async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("conversations")
      .select("*")
      .is("agent_id", null)
      .order("last_message_at", { ascending: false })

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.json(data ?? [])
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar conversas não atribuídas" })
  }
})

/**
 * GET Conversations por agente específico
 */
app.get("/conversations/by-agent/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params

    const { data, error } = await supabaseAdmin
      .from("conversations")
      .select("*")
      .eq("agent_id", userId)
      .order("last_message_at", { ascending: false })

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.json(data ?? [])
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar conversas do agente" })
  }
})

/**
 * POST Lock Conversation
 * Body: { userId: string, role?: string }
 * (role pode vir também via header x-user-role)
 */
app.post("/conversations/:id/lock", async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { userId, role: roleBody } = req.body as { userId?: string; role?: string }

    if (!userId) {
      return res.status(400).json({ error: "userId é obrigatório" })
    }

    const roleHeader = req.headers["x-user-role"]
    const role = normRole(roleBody ?? roleHeader)

    // ✅ Diretoria/Admin: nunca trava conversa
    if (isPrivilegedRole(role)) {
      return res.json({ success: true, skipped: true })
    }

    const { data: conversation, error: convErr } = await supabaseAdmin
      .from("conversations")
      .select("agent_id")
      .eq("id", id)
      .single()

    if (convErr || !conversation) {
      return res.status(404).json({ error: "Conversa não encontrada" })
    }

    if (conversation.agent_id && conversation.agent_id !== userId) {
      return res.status(403).json({
        error: "Essa conversa já está sendo atendida"
      })
    }

    const { error: upErr } = await supabaseAdmin
      .from("conversations")
      .update({
        agent_id: userId,
        locked_at: new Date()
      })
      .eq("id", id)

    if (upErr) {
      return res.status(500).json({ error: upErr.message })
    }

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: "Erro ao bloquear conversa" })
  }
})

/**
 * POST Unlock Conversation
 */
app.post("/conversations/:id/unlock", async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const role = normRole((req.body as any)?.role)

    // Apenas admin pode forçar unlock
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

/**
 * ✅ GET Agents (SEM name)
 * Busca no auth.users (id/email) e retorna:
 * [{ id, email, role: "agent" }]
 */
app.get("/agents", async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

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

/**
 * ✅ POST Transfer Conversation
 * Body: { toUserId: string }
 * Transfere a conversa e já trava no novo agente.
 */
app.post("/conversations/:id/transfer", async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { toUserId } = req.body as { toUserId?: string }

    if (!toUserId) {
      return res.status(400).json({ error: "toUserId é obrigatório" })
    }

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

    if (upError) {
      return res.status(500).json({ error: upError.message })
    }

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

/**
 * PUT Update Conversation
 */
app.put("/conversations/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, email } = req.body

    const { data, error } = await supabaseAdmin
      .from("conversations")
      .update({ name, email })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("❌ Supabase error:", error)
      return res.status(500).json({ error: error.message })
    }

    res.json(data)
  } catch (error) {
    console.error("Erro ao atualizar cliente:", error)
    res.status(500).json({ error: "Erro ao atualizar cliente" })
  }
})

/**
 * POST Send Message
 */
app.post("/send", async (req: Request, res: Response) => {
  try {
    const { conversationId, phone, message } = req.body as any

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
      return res.status(400).json({
        error: "conversationId ou phone é obrigatório"
      })
    }

    const cleanPhone = String(finalPhone).replace(/\D/g, "")
    const jid = `${cleanPhone}@s.whatsapp.net`

    let conversationIdFinal = conversationId

    // ✅ Criar conversa ao enviar para um phone ainda não existente
    if (!conversationId && phone) {
      const { userId, role } = req.body as { userId?: string; role?: string }

      if (!userId) {
        return res.status(400).json({ error: "userId é obrigatório" })
      }

      const privileged = isPrivilegedRole(role)

      const insertPayload: any = {
        phone: cleanPhone,
        last_message: message,
        last_message_at: new Date()
      }

      // ✅ Só agente nasce atribuída / lockada
      if (!privileged) {
        insertPayload.agent_id = userId
        insertPayload.locked_at = new Date()
      }

      const { data: newConversation, error } = await supabaseAdmin
        .from("conversations")
        .insert(insertPayload)
        .select()
        .single()

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      conversationIdFinal = newConversation.id
    }

    console.log("📤 Enviando para:", jid)

    await sock.sendMessage(jid, { text: message })

    await supabaseAdmin.from("messages").insert({
      conversation_id: conversationIdFinal,
      phone: cleanPhone,
      direction: "outbound",
      message,
      created_at: new Date()
    })

    // 🔥 ATUALIZA ÚLTIMA MENSAGEM SEMPRE
    await supabaseAdmin
      .from("conversations")
      .update({
        last_message: message,
        last_message_at: new Date()
      })
      .eq("id", conversationIdFinal)

    res.json({ success: true })
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
      const { conversationId } = req.body as any
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

      if (file.mimetype.startsWith("image/")) {
        messageType = "image"

        sendPayload = { image: fileBuffer }

        const finalPath = path.join(
          uploadsDir,
          file.filename + path.extname(file.originalname)
        )

        fs.renameSync(file.path, finalPath)

        mediaUrl = `http://localhost:4000/uploads/${path.basename(finalPath)}`
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

        mediaUrl = `http://localhost:4000/uploads/${path.basename(finalPath)}`

        fs.unlinkSync(inputPath)
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

        mediaUrl = `http://localhost:4000/uploads/${path.basename(finalPath)}`
      }

      await sock.sendMessage(jid, sendPayload)

      await supabaseAdmin.from("messages").insert({
        conversation_id: conversationId,
        phone: cleanPhone,
        direction: "outbound",
        message: file.originalname,
        type: messageType,
        media_url: mediaUrl,
        created_at: new Date()
      })

      res.json({ success: true })
    } catch (error) {
      console.error("Erro ao enviar mídia:", error)
      res.status(500).json({ error: "Erro ao enviar mídia" })
    }
  }
)

/**
 * Restart
 */
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

/**
 * Disconnect
 */
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