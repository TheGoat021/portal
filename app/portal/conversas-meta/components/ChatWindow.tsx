// app/portal/conversas-meta/components/ChatWindow.tsx

"use client"

import { useEffect, useRef, useState } from "react"
import {
  Paperclip,
  Image as ImageIcon,
  Mic,
  Send,
  Trash2,
  FileText,
  MessageSquare,
  Check,
  CheckCheck,
  Reply,
  Sticker,
  Video,
  UserRound,
  Users,
  X,
  CircleStop
} from "lucide-react"
import { supabase } from "@/lib/supabaseClient"

interface Props {
  selectedConversationId: string | null
  onCloseConversation: () => void
  currentUser: {
    id: string
    email: string
  }
}

interface BackendMetaMessage {
  id: string
  message: string | null
  direction: "inbound" | "outbound"
  created_at: string
  type?:
    | "text"
    | "image"
    | "audio"
    | "ptt"
    | "document"
    | "video"
    | "sticker"
    | "contact"
    | "location"
    | "reply"
    | "system"
    | "unknown"
  media_url?: string | null
  status?: "sent" | "delivered" | "read" | "failed" | null
  caption?: string | null
  context_message_id?: string | null
  meta_message_id?: string | null
  mime_type?: string | null
  file_name?: string | null
  agent_email?: string | null
}

interface Message {
  id: string
  text: string
  direction: "inbound" | "outbound"
  createdAt: string
  type:
    | "text"
    | "image"
    | "audio"
    | "ptt"
    | "document"
    | "video"
    | "sticker"
    | "contact"
    | "location"
    | "reply"
    | "system"
    | "unknown"
  mediaUrl?: string | null
  status?: "sent" | "delivered" | "read" | "failed" | null
  caption?: string | null
  contextMessageId?: string | null
  metaMessageId?: string | null
  mimeType?: string | null
  fileName?: string | null
  agentEmail?: string | null
  isSystem?: boolean
}

type MetaConversation = {
  id: string
  connection_id: string
  wa_id: string
  contact_name?: string | null
  profile_name?: string | null
  last_message?: string | null
  last_message_at?: string | null
}

export default function ChatWindow({ selectedConversationId, onCloseConversation, currentUser }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [conversation, setConversation] = useState<MetaConversation | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [recordTime, setRecordTime] = useState(0)
  const [loading, setLoading] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [sendingMedia, setSendingMedia] = useState(false)
  const [agents, setAgents] = useState<Array<{ id: string; email: string; role: string }>>([])
  const [transferOpen, setTransferOpen] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState("")
  const [transferTo, setTransferTo] = useState("")
  const [agentsLoading, setAgentsLoading] = useState(false)
  const [transferSaving, setTransferSaving] = useState(false)
  const [closingConversation, setClosingConversation] = useState(false)

  const recordIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const recordMimeTypeRef = useRef<string>("audio/ogg")
  const shouldSendRecordingRef = useRef(false)

  function formatTime(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  function formatDateTime(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  function formatRecordTime(seconds: number) {
    const mm = String(Math.floor(seconds / 60)).padStart(2, "0")
    const ss = String(seconds % 60).padStart(2, "0")
    return `${mm}:${ss}`
  }

  async function fetchConversation(conversationId: string) {
    const { data, error } = await supabase
      .from("meta_conversations")
      .select("id, connection_id, wa_id, contact_name, profile_name, last_message, last_message_at")
      .eq("id", conversationId)
      .single()

    if (error) {
      console.error("Erro ao buscar conversa meta:", error)
      setConversation(null)
      return
    }

    setConversation(data)
  }

  const fetchMessages = async (conversationId: string) => {
    try {
      setLoading(true)

      const res = await fetch(`/api/whatsapp-meta/conversations/${conversationId}/messages`, {
        cache: "no-store"
      })

      if (!res.ok) {
        console.error("Erro ao buscar mensagens meta:", await res.text())
        return
      }

      const payload = await res.json()
      const data: BackendMetaMessage[] = Array.isArray(payload) ? payload : payload?.data ?? []

      const mapped: Message[] = (data ?? []).map((msg) => ({
        id: String(msg.id),
        text: msg.message ?? "",
        direction: msg.direction,
        createdAt: msg.created_at,
        type: msg.type || "text",
        mediaUrl: msg.media_url || null,
        status: msg.status || null,
        caption: msg.caption || null,
        contextMessageId: msg.context_message_id || null,
        metaMessageId: msg.meta_message_id || null,
        mimeType: msg.mime_type || null,
        fileName: msg.file_name || null,
        agentEmail: msg.agent_email || null,
        isSystem: msg.type === "system"
      }))

      setMessages(mapped)
    } catch (error) {
      console.error("Erro ao buscar mensagens meta:", error)
    } finally {
      setLoading(false)
    }
  }

  async function markConversationAsRead(conversationId: string) {
    try {
      await fetch(`/api/whatsapp-meta/conversations/${conversationId}/read`, {
        method: "POST"
      })
    } catch (error) {
      console.error("Erro ao marcar conversa como lida:", error)
    }
  }

  const openTransfer = async () => {
    if (!selectedConversationId) return

    setTransferOpen(true)
    setSelectedDepartment("")
    setTransferTo("")
    setAgents([])
    setAgentsLoading(true)

    try {
      const res = await fetch("/api/agents", { cache: "no-store" })
      if (!res.ok) {
        console.error("Erro ao carregar atendentes:", await res.text())
        return
      }

      const data = await res.json()
      const list = Array.isArray(data) ? data : []
      setAgents(
        list.map((item) => ({
          id: String(item.id),
          email: String(item.email || ""),
          role: String(item.role || "Sem departamento")
        }))
      )
    } catch (error) {
      console.error("Erro ao carregar atendentes:", error)
    } finally {
      setAgentsLoading(false)
    }
  }

  const confirmTransfer = async () => {
    if (!selectedConversationId || !transferTo || transferSaving) return

    try {
      setTransferSaving(true)

      const res = await fetch(`/api/whatsapp-meta/conversations/${selectedConversationId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toUserId: transferTo,
          byUserId: currentUser.id
        })
      })

      if (!res.ok) {
        console.error("Erro ao transferir conversa meta:", await res.text())
        return
      }

      setTransferOpen(false)
      await fetchMessages(selectedConversationId)
    } catch (error) {
      console.error("Erro ao transferir conversa meta:", error)
    } finally {
      setTransferSaving(false)
    }
  }

  const closeAttendance = async () => {
    if (!selectedConversationId || closingConversation) return

    try {
      setClosingConversation(true)
      const res = await fetch(`/api/whatsapp-meta/conversations/${selectedConversationId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          byUserId: currentUser.id
        })
      })

      if (!res.ok) {
        console.error("Erro ao encerrar atendimento:", await res.text())
        return
      }

      onCloseConversation()
    } catch (error) {
      console.error("Erro ao encerrar atendimento:", error)
    } finally {
      setClosingConversation(false)
    }
  }

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([])
      setConversation(null)
      setLoading(false)
      return
    }

    let active = true
    setMessages([])

    fetchConversation(selectedConversationId)
    fetchMessages(selectedConversationId)
    markConversationAsRead(selectedConversationId)

    const interval = setInterval(() => {
      if (!active) return
      fetchMessages(selectedConversationId)
    }, 2500)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [selectedConversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  useEffect(() => {
    return () => {
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current)
      try {
        streamRef.current?.getTracks().forEach((track) => track.stop())
      } catch {}
    }
  }, [])

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversationId || !conversation || sendingMessage) return

    const messageToSend = newMessage.trim()

    try {
      setSendingMessage(true)
      setNewMessage("")

      const res = await fetch(`/api/meta/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionId: conversation.connection_id,
          conversationId: selectedConversationId,
          to: conversation.wa_id,
          message: messageToSend,
          agentId: currentUser.id,
          agentEmail: currentUser.email
        })
      })

      const payload = await res.json().catch(() => null)

      if (!res.ok || !payload?.ok) {
        console.error("Erro ao enviar mensagem meta:", payload || (await res.text()))
        setNewMessage(messageToSend)
        return
      }

      await fetchMessages(selectedConversationId)
    } catch (error) {
      console.error("Erro ao enviar mensagem meta:", error)
      setNewMessage(messageToSend)
    } finally {
      setSendingMessage(false)
    }
  }

  function inferMediaType(file: File): "image" | "video" | "audio" | "document" {
    const mime = (file.type || "").toLowerCase()
    if (mime.startsWith("image/")) return "image"
    if (mime.startsWith("video/")) return "video"
    if (mime.startsWith("audio/")) return "audio"
    return "document"
  }

  const sendMedia = async (file: File) => {
    if (!selectedConversationId || !conversation || sendingMedia) return

    const caption = newMessage.trim()
    const formData = new FormData()
    formData.append("connectionId", conversation.connection_id)
    formData.append("conversationId", selectedConversationId)
    formData.append("to", conversation.wa_id)
    formData.append("type", inferMediaType(file))
    formData.append("caption", caption)
    formData.append("file", file)
    formData.append("agentId", currentUser.id)
    formData.append("agentEmail", currentUser.email)

    try {
      setSendingMedia(true)
      setNewMessage("")

      const res = await fetch("/api/whatsapp-meta/send-media", {
        method: "POST",
        body: formData
      })

      if (!res.ok) {
        console.error("Erro ao enviar mídia meta:", await res.text())
        if (caption) setNewMessage(caption)
        return
      }

      await fetchMessages(selectedConversationId)
    } catch (error) {
      console.error("Erro ao enviar mídia meta:", error)
      if (caption) setNewMessage(caption)
    } finally {
      setSendingMedia(false)
    }
  }

  const stopStreamTracks = () => {
    try {
      streamRef.current?.getTracks().forEach((track) => track.stop())
    } catch {}
    streamRef.current = null
  }

  function resolveMediaUrl(msg: Message) {
    if (msg.mediaUrl) return msg.mediaUrl

    const hasMediaType =
      msg.type === "image" ||
      msg.type === "video" ||
      msg.type === "audio" ||
      msg.type === "ptt" ||
      msg.type === "document"

    if (!hasMediaType) return null
    return `/api/whatsapp-meta/messages/${msg.id}/media`
  }

  function pickRecordingMimeType() {
    if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
      return ""
    }

    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/ogg"
    ]

    for (const candidate of candidates) {
      if (MediaRecorder.isTypeSupported(candidate)) {
        return candidate
      }
    }

    return ""
  }

  function fileNameForRecordedAudio(mimeType: string) {
    const ts = Date.now()
    if (mimeType.includes("mp4")) return `audio_${ts}.m4a`
    if (mimeType.includes("mpeg")) return `audio_${ts}.mp3`
    if (mimeType.includes("aac")) return `audio_${ts}.aac`
    return `audio_${ts}.ogg`
  }

  const startRecording = async () => {
    if (!selectedConversationId || !conversation || sendingMedia || sendingMessage) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const selectedMimeType = pickRecordingMimeType()

      if (!selectedMimeType) {
        console.error(
          "Navegador sem suporte a gravação de áudio em formato aceito pela Meta. Use upload de áudio (.ogg/.m4a/.mp3)."
        )
        stopStreamTracks()
        return
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType: selectedMimeType })
      recordMimeTypeRef.current = selectedMimeType
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      shouldSendRecordingRef.current = true

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        try {
          if (!shouldSendRecordingRef.current) return
          if (audioChunksRef.current.length === 0) return

          const mimeType = recordMimeTypeRef.current || "audio/ogg"
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
          const file = new File([audioBlob], fileNameForRecordedAudio(mimeType), {
            type: mimeType
          })

          await sendMedia(file)
        } finally {
          shouldSendRecordingRef.current = false
          setRecordTime(0)
          audioChunksRef.current = []
          stopStreamTracks()
        }
      }

      mediaRecorder.start()
      setIsRecording(true)

      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current)
      recordIntervalRef.current = setInterval(() => {
        setRecordTime((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      console.error("Erro ao iniciar gravação:", error)
      stopStreamTracks()
      setIsRecording(false)
      setRecordTime(0)
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current)
    }
  }

  const stopRecording = () => {
    shouldSendRecordingRef.current = true
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current)
  }

  const cancelRecording = () => {
    shouldSendRecordingRef.current = false
    audioChunksRef.current = []
    mediaRecorderRef.current?.stop()
    stopStreamTracks()
    setIsRecording(false)
    setRecordTime(0)
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current)
  }

  function renderStatusIcon(msg: Message) {
    if (msg.direction !== "outbound") return null

    if (msg.status === "read") {
      return <CheckCheck size={14} className="text-sky-500" />
    }

    if (msg.status === "delivered") {
      return <CheckCheck size={14} className="text-gray-500" />
    }

    if (msg.status === "sent") {
      return <Check size={14} className="text-gray-500" />
    }

    return null
  }

  function renderQuotedMessage(msg: Message) {
    if (!msg.contextMessageId) return null

    return (
      <div className="mb-2 rounded-xl border-l-4 border-green-400 bg-black/5 px-3 py-2">
        <div className="mb-1 flex items-center gap-1 text-[11px] font-medium text-gray-600">
          <Reply size={12} />
          <span>Mensagem respondida</span>
        </div>
        <div className="text-xs text-gray-700 break-words">
          ID: {msg.contextMessageId}
        </div>
      </div>
    )
  }

  function renderMessageContent(msg: Message) {
    if (msg.type === "system" || msg.isSystem) {
      return null
    }

    const mediaUrl = resolveMediaUrl(msg)

    if (msg.type === "sticker") {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Sticker size={16} className="opacity-70" />
          <span>{msg.text || "Figurinha"}</span>
        </div>
      )
    }

    if (msg.type === "image") {
      if (mediaUrl) {
        return (
          <div className="space-y-2">
            <img
              src={mediaUrl}
              alt="Imagem"
              className="rounded-lg max-w-xs border border-black/5"
            />
            {!!msg.caption && (
              <p className="text-sm whitespace-pre-wrap break-words">{msg.caption}</p>
            )}
          </div>
        )
      }

      return (
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <ImageIcon size={16} className="opacity-70" />
          <span>{msg.text || "Imagem"}</span>
        </div>
      )
    }

    if (msg.type === "video") {
      if (mediaUrl) {
        return (
          <div className="space-y-2">
            <video controls className="rounded-lg max-w-xs border border-black/5">
              <source src={mediaUrl} />
            </video>
            {!!msg.caption && (
              <p className="text-sm whitespace-pre-wrap break-words">{msg.caption}</p>
            )}
          </div>
        )
      }

      return (
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Video size={16} className="opacity-70" />
          <span>{msg.text || "Vídeo"}</span>
        </div>
      )
    }

    if (msg.type === "audio" || msg.type === "ptt") {
      if (mediaUrl) {
        return (
          <div className="flex items-center gap-2">
            <Mic size={16} className="opacity-70" />
            <audio controls className="w-64">
              <source src={mediaUrl} />
            </audio>
          </div>
        )
      }

      return (
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Mic size={16} className="opacity-70" />
          <span>{msg.type === "ptt" ? "Áudio" : msg.text || "Áudio"}</span>
        </div>
      )
    }

    if (msg.type === "document") {
      if (mediaUrl) {
        return (
          <a
            href={mediaUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-700 hover:underline"
          >
            <FileText size={16} className="opacity-70" />
            <span>{msg.fileName || msg.text || "Baixar documento"}</span>
          </a>
        )
      }

      return (
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <FileText size={16} className="opacity-70" />
          <span>{msg.fileName || msg.text || "Documento"}</span>
        </div>
      )
    }

    if (msg.type === "contact") {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <UserRound size={16} className="opacity-70" />
          <span>{msg.text || "Contato"}</span>
        </div>
      )
    }

    return <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
  }

  function renderSystemMessage(msg: Message) {
    return (
      <div key={msg.id} className="flex justify-center py-2">
        <div className="max-w-[80%] rounded-2xl bg-[#FFF3CD] text-[#6B5B00] px-4 py-3 text-center shadow-sm border border-[#F3E19C]">
          <div className="text-sm italic">{msg.text}</div>
          <div className="mt-1 text-xs opacity-70">{formatDateTime(msg.createdAt)}</div>
        </div>
      </div>
    )
  }

  const iconBtn =
    "flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/62 text-slate-600 shadow-[0_8px_24px_rgba(148,163,184,0.12)] transition hover:bg-white active:scale-[0.98] disabled:opacity-60 disabled:hover:bg-white/62"

  const conversationLabel =
    conversation?.contact_name ||
    conversation?.profile_name ||
    conversation?.wa_id ||
    "Conversa selecionada"

  const departments = Array.from(
    new Set(
      agents
        .map((agent) => (agent.role || "Sem departamento").trim() || "Sem departamento")
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b))

  const filteredAgents = agents.filter((agent) => {
    if (!selectedDepartment) return false
    const department = (agent.role || "Sem departamento").trim() || "Sem departamento"
    return department === selectedDepartment
  })

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.26),rgba(248,250,255,0.38))]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 bottom-0 top-[24%] opacity-95">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(255,255,255,0.96),rgba(255,255,255,0)_30%),radial-gradient(circle_at_22%_42%,rgba(112,211,252,0.44),rgba(255,255,255,0)_18%),radial-gradient(circle_at_56%_74%,rgba(139,92,246,0.26),rgba(255,255,255,0)_24%),radial-gradient(circle_at_82%_44%,rgba(34,211,238,0.22),rgba(255,255,255,0)_18%)]" />
          <div className="absolute left-[12%] top-[14%] h-[26%] w-[26%] rounded-full bg-cyan-300/45 blur-[88px] mix-blend-screen" />
          <div className="absolute left-[10%] bottom-[6%] h-[24%] w-[38%] rounded-full bg-fuchsia-300/18 blur-[92px] mix-blend-screen" />
          <div className="absolute right-[10%] bottom-[10%] h-[24%] w-[30%] rounded-full bg-sky-200/34 blur-[88px] mix-blend-screen" />
          <div className="absolute left-[24%] bottom-[16%] h-[12%] w-[30%] rounded-full bg-violet-400/18 blur-[70px]" />
          <svg className="absolute bottom-[8%] left-0 h-[48%] w-full opacity-[0.99]" viewBox="0 0 1200 420" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="auroraWaveFront" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(167,139,250,0.72)" />
                <stop offset="25%" stopColor="rgba(96,165,250,0.68)" />
                <stop offset="50%" stopColor="rgba(34,211,238,0.62)" />
                <stop offset="75%" stopColor="rgba(196,181,253,0.58)" />
                <stop offset="100%" stopColor="rgba(248,250,255,0.42)" />
              </linearGradient>
              <linearGradient id="auroraWaveFrontUnderside" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(124,58,237,0.32)" />
                <stop offset="35%" stopColor="rgba(59,130,246,0.28)" />
                <stop offset="64%" stopColor="rgba(14,165,233,0.2)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
              </linearGradient>
              <linearGradient id="auroraWaveMid" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(167,139,250,0.38)" />
                <stop offset="35%" stopColor="rgba(96,165,250,0.34)" />
                <stop offset="70%" stopColor="rgba(34,211,238,0.3)" />
                <stop offset="100%" stopColor="rgba(196,181,253,0.22)" />
              </linearGradient>
              <linearGradient id="auroraWaveMidUnderside" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(139,92,246,0.18)" />
                <stop offset="36%" stopColor="rgba(59,130,246,0.16)" />
                <stop offset="72%" stopColor="rgba(6,182,212,0.12)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.04)" />
              </linearGradient>
              <linearGradient id="auroraWaveBack" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(167,139,250,0.18)" />
                <stop offset="40%" stopColor="rgba(96,165,250,0.16)" />
                <stop offset="72%" stopColor="rgba(34,211,238,0.14)" />
                <stop offset="100%" stopColor="rgba(196,181,253,0.1)" />
              </linearGradient>
              <linearGradient id="auroraWaveHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                <stop offset="36%" stopColor="rgba(255,255,255,0.82)" />
                <stop offset="62%" stopColor="rgba(255,255,255,0.36)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.04)" />
              </linearGradient>
              <filter id="auroraShadow" x="-20%" y="-20%" width="140%" height="160%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="16" result="blur" />
                <feOffset dy="18" result="offsetBlur" />
                <feColorMatrix
                  in="offsetBlur"
                  type="matrix"
                  values="0 0 0 0 0.43 0 0 0 0 0.33 0 0 0 0 0.94 0 0 0 0.18 0"
                  result="shadow"
                />
                <feBlend in="SourceGraphic" in2="shadow" mode="normal" />
              </filter>
              <filter id="auroraInnerGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="8" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <g opacity="0.84">
              <path d="M-42 334C58 340 122 302 212 302C326 302 382 388 494 388C626 388 656 188 814 188C940 188 1020 250 1238 272L1238 420L-42 420Z" fill="url(#auroraWaveBack)" />
            </g>
            <g filter="url(#auroraInnerGlow)" opacity="0.92">
              <path d="M-28 314C74 322 138 266 222 266C324 266 366 354 478 354C620 354 654 196 812 196C944 196 1018 238 1230 248L1230 420L-28 420Z" fill="url(#auroraWaveMidUnderside)" />
              <path d="M-24 300C76 308 140 256 220 256C320 256 358 352 476 352C620 352 650 186 810 186C944 186 1016 236 1230 244L1230 420L-24 420Z" fill="url(#auroraWaveMid)" />
            </g>
            <g filter="url(#auroraShadow)">
              <path d="M-14 302C92 302 152 232 238 232C344 232 384 332 500 332C642 332 672 136 826 136C956 136 1022 220 1228 226L1228 420L-14 420Z" fill="url(#auroraWaveFrontUnderside)" opacity="0.9" />
              <path d="M-18 284C84 284 144 220 232 220C336 220 364 330 486 330C640 330 660 114 822 114C958 114 1020 214 1226 220L1226 420L-18 420Z" fill="url(#auroraWaveFront)" />
            </g>
            <path d="M-6 270C96 270 150 210 240 210C342 210 370 320 492 320C644 320 664 102 824 102C958 102 1024 206 1212 212" fill="none" stroke="url(#auroraWaveHighlight)" strokeWidth="10" strokeLinecap="round" />
            <path d="M16 286C114 286 164 238 246 238C338 238 376 318 490 318C630 318 666 124 818 124C944 124 1016 208 1186 214" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="4" strokeLinecap="round" />
          </svg>
          <div className="absolute bottom-[9%] left-[8%] h-32 w-80 opacity-40 [background-image:radial-gradient(circle,rgba(255,255,255,0.42)_1px,transparent_1.5px)] [background-size:10px_10px] [mask-image:radial-gradient(circle_at_18%_55%,rgba(0,0,0,1),rgba(0,0,0,0.42),transparent_78%)]" />
        </div>
      </div>

      <div className="relative z-10 flex h-16 items-center justify-between border-b border-white/60 bg-white/36 px-4 backdrop-blur-xl">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate">
            {selectedConversationId ? conversationLabel : "Selecione uma conversa"}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {conversation?.wa_id ?? selectedConversationId ?? ""}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={openTransfer}
            className={iconBtn}
            title="Transferir para outro atendente"
            disabled={!selectedConversationId || transferSaving || closingConversation}
          >
            <Users size={20} />
          </button>

          <button
            type="button"
            onClick={closeAttendance}
            className={iconBtn}
            title="Encerrar atendimento"
            disabled={!selectedConversationId || transferSaving || closingConversation}
          >
            <CircleStop size={20} />
          </button>
        </div>
      </div>

      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto px-4 py-5 space-y-3">
        {!selectedConversationId ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-600">
              <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-white/70 flex items-center justify-center border border-black/5">
                <MessageSquare size={22} className="opacity-70" />
              </div>
              <div className="font-medium">Selecione uma conversa</div>
              <div className="text-sm opacity-70">As mensagens da Meta aparecerão aqui.</div>
            </div>
          </div>
        ) : (
          <>
            {loading && messages.length === 0 && (
              <div className="text-sm text-gray-500">Carregando mensagens...</div>
            )}

            {messages.map((msg) => {
              if (msg.isSystem || msg.type === "system") {
                return renderSystemMessage(msg)
              }

              const outbound = msg.direction === "outbound"

              return (
                <div
                  key={msg.id}
                  className={`flex ${outbound ? "justify-end" : "justify-start"}`}
                >
                  <div className="max-w-[75%]">
                    {outbound && msg.agentEmail && (
                      <div className="px-1 mb-1 text-xs font-semibold text-gray-700">
                        {msg.agentEmail}:
                      </div>
                    )}

                    <div
                      className={`rounded-2xl px-3 py-2 shadow-sm border border-black/5 ${
                        outbound ? "bg-[#D9FDD3]" : "bg-white"
                      }`}
                    >
                      {renderQuotedMessage(msg)}
                      {renderMessageContent(msg)}

                      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] leading-none text-slate-500">
                        <span>{formatTime(msg.createdAt)}</span>
                        {renderStatusIcon(msg)}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            <div ref={bottomRef} />
          </>
        )}
      </div>

      <div className="relative z-10 border-t border-white/60 bg-white/36 px-3 py-3 backdrop-blur-xl">
        {!isRecording ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={iconBtn}
              title="Anexar"
              disabled={!selectedConversationId || !conversation || sendingMedia || sendingMessage}
            >
              <Paperclip size={20} />
            </button>

            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className={iconBtn}
              title="Imagem"
              disabled={!selectedConversationId || !conversation || sendingMedia || sendingMessage}
            >
              <ImageIcon size={20} />
            </button>

            <div className="flex-1">
              <textarea
                className="w-full min-h-[42px] max-h-32 resize-none overflow-y-auto rounded-2xl border border-white/75 bg-white/72 px-4 py-2.5 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] outline-none disabled:opacity-60"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={
                  selectedConversationId ? "Digite uma mensagem" : "Selecione uma conversa"
                }
                disabled={!selectedConversationId || !conversation || sendingMessage || sendingMedia}
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    if (!sendingMessage && !sendingMedia) {
                      sendMessage()
                    }
                  }
                }}
              />
            </div>

            {newMessage.trim().length === 0 ? (
              <button
                type="button"
                onClick={startRecording}
                className={iconBtn}
                title="Gravar áudio"
                disabled={!selectedConversationId || !conversation || sendingMedia || sendingMessage}
              >
                <Mic size={20} />
              </button>
            ) : (
              <button
                type="button"
                onClick={sendMessage}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#7c3aed,#60a5fa)] text-white shadow-[0_14px_30px_rgba(124,58,237,0.24)] transition disabled:opacity-60"
                title="Enviar"
                disabled={!selectedConversationId || !conversation || sendingMessage || sendingMedia}
              >
                <Send size={18} />
              </button>
            )}

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) sendMedia(file)
                e.currentTarget.value = ""
              }}
            />

            <input
              type="file"
              accept="image/*"
              ref={imageInputRef}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) sendMedia(file)
                e.currentTarget.value = ""
              }}
            />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={cancelRecording}
              className={iconBtn}
              title="Cancelar"
              disabled={sendingMedia}
            >
              <Trash2 size={20} className="text-red-500" />
            </button>

            <div className="flex h-10 flex-1 items-center gap-3 rounded-full border border-white/75 bg-white/72 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              <div className="text-sm font-medium text-gray-700 tabular-nums">
                {formatRecordTime(recordTime)}
              </div>

              <div className="flex flex-1 items-center gap-1 opacity-70">
                <span className="h-2 w-1 rounded-full bg-violet-400 animate-pulse" />
                <span className="h-3 w-1 rounded-full bg-sky-400 animate-pulse" />
                <span className="h-5 w-1 rounded-full bg-violet-400 animate-pulse" />
                <span className="h-3 w-1 rounded-full bg-sky-400 animate-pulse" />
                <span className="h-2 w-1 rounded-full bg-violet-400 animate-pulse" />
              </div>
            </div>

            <button
              type="button"
              onClick={stopRecording}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#7c3aed,#60a5fa)] text-white shadow-[0_14px_30px_rgba(124,58,237,0.24)] transition disabled:opacity-60"
              title="Enviar áudio"
              disabled={sendingMedia}
            >
              <Send size={18} />
            </button>
          </div>
        )}
      </div>

      {transferOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="w-[560px] max-w-[96vw] bg-white rounded-2xl shadow-xl border border-black/5 overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Transferir conversa Meta</div>
                <div className="text-xs text-gray-500">Atendentes agrupados por departamento</div>
              </div>

              <button
                className="h-9 w-9 rounded-full hover:bg-gray-100 flex items-center justify-center"
                onClick={() => setTransferOpen(false)}
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <label className="text-xs text-gray-500">Atendente de destino</label>

              <select
                value={selectedDepartment}
                onChange={(e) => {
                  setSelectedDepartment(e.target.value)
                  setTransferTo("")
                }}
                className="w-full h-11 px-4 rounded-xl border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                disabled={agentsLoading || transferSaving}
              >
                <option value="">
                  {agentsLoading ? "Carregando setores..." : "Selecione um setor"}
                </option>
                {departments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>

              <select
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                disabled={agentsLoading || transferSaving || !selectedDepartment}
              >
                <option value="">
                  {agentsLoading
                    ? "Carregando atendentes..."
                    : !selectedDepartment
                      ? "Selecione um setor primeiro"
                      : "Selecione um atendente"}
                </option>

                {filteredAgents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.email}
                  </option>
                ))}
              </select>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  className="px-4 py-2 rounded-xl border hover:bg-gray-50"
                  onClick={() => setTransferOpen(false)}
                  disabled={transferSaving}
                >
                  Cancelar
                </button>

                <button
                  className="px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-black disabled:opacity-60"
                  onClick={confirmTransfer}
                  disabled={!transferTo || transferSaving}
                >
                  {transferSaving ? "Transferindo..." : "Confirmar transferência"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

