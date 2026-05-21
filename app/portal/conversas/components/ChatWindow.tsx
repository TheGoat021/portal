"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Paperclip,
  Image as ImageIcon,
  Mic,
  Send,
  Trash2,
  FileText,
  Users,
  X,
  CircleStop,
  MessageSquare,
  Check,
  CheckCheck,
  Reply,
  Sticker,
  Video,
  MapPin,
  UserRound
} from "lucide-react"

interface Props {
  selectedConversationId: string | null
  onCloseConversation: () => void
  currentUser: {
    id: string
    email: string
  }
}

interface BackendMessage {
  id: string
  message: string
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
    | "revoked"
    | "edited"
    | "button_response"
    | "list_response"
    | "template_button_reply"
    | "interactive_response"
    | "unknown"
  media_url?: string | null
  agent_name?: string | null
  is_system?: boolean
  status?: "sent" | "delivered" | "read" | null
  quoted_message?: string | null
  quoted_whatsapp_message_id?: string | null
  raw_type?: string | null
  whatsapp_message_id?: string | null
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
    | "revoked"
    | "edited"
    | "button_response"
    | "list_response"
    | "template_button_reply"
    | "interactive_response"
    | "unknown"
  mediaUrl?: string | null
  agentName?: string | null
  isSystem?: boolean
  status?: "sent" | "delivered" | "read" | null
  quotedMessage?: string | null
  quotedWhatsappMessageId?: string | null
  rawType?: string | null
  whatsappMessageId?: string | null
}

type Agent = {
  id: string
  email: string
  role: string
}

export default function ChatWindow({ selectedConversationId, onCloseConversation, currentUser }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [recordTime, setRecordTime] = useState(0)
  const [loading, setLoading] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [sendingMedia, setSendingMedia] = useState(false)

  const [transferOpen, setTransferOpen] = useState(false)
  const [agents, setAgents] = useState<Agent[]>([])
  const [agentsLoading, setAgentsLoading] = useState(false)
  const [transferTo, setTransferTo] = useState<string>("")
  const [transferSaving, setTransferSaving] = useState(false)
  const [closingConversation, setClosingConversation] = useState(false)

  const recordIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
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

  const fetchMessages = async (conversationId: string) => {
    try {
      setLoading(true)

      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        cache: "no-store"
      })

      if (!res.ok) {
        console.error("Erro ao buscar mensagens:", await res.text())
        return
      }

      const data: BackendMessage[] = await res.json()

      const mapped: Message[] = (data ?? []).map((msg) => ({
        id: String(msg.id),
        text: msg.message ?? "",
        direction: msg.direction,
        createdAt: msg.created_at,
        type: msg.is_system ? "system" : msg.type || "text",
        mediaUrl: msg.media_url || null,
        agentName: msg.agent_name || null,
        isSystem: Boolean(msg.is_system) || msg.type === "system",
        status: msg.status || null,
        quotedMessage: msg.quoted_message || null,
        quotedWhatsappMessageId: msg.quoted_whatsapp_message_id || null,
        rawType: msg.raw_type || null,
        whatsappMessageId: msg.whatsapp_message_id || null
      }))

      setMessages(mapped)
    } catch (error) {
      console.error("Erro ao buscar mensagens:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([])
      setLoading(false)
      return
    }

    let active = true
    setMessages([])
    fetchMessages(selectedConversationId)

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

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversationId || sendingMessage) return

    const messageToSend = newMessage

    try {
      setSendingMessage(true)
      setNewMessage("")

      const res = await fetch(`/api/conversations/${selectedConversationId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageToSend,
          agentId: currentUser.id,
          agentEmail: currentUser.email
        })
      })

      if (!res.ok) {
        console.error("Erro ao enviar mensagem:", await res.text())
        setNewMessage(messageToSend)
        return
      }

      await fetchMessages(selectedConversationId)
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error)
      setNewMessage(messageToSend)
    } finally {
      setSendingMessage(false)
    }
  }

  const sendMedia = async (file: File) => {
    if (!selectedConversationId || sendingMedia) return

    const formData = new FormData()
    formData.append("file", file)
    formData.append("agentId", currentUser.id)
    formData.append("agentEmail", currentUser.email)

    try {
      setSendingMedia(true)

      const res = await fetch(`/api/conversations/${selectedConversationId}/send-media`, {
        method: "POST",
        body: formData
      })

      if (!res.ok) {
        console.error("Erro ao enviar mídia:", await res.text())
        return
      }

      await fetchMessages(selectedConversationId)
    } catch (error) {
      console.error("Erro ao enviar mídia:", error)
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

  const startRecording = async () => {
    if (!selectedConversationId || sendingMedia || sendingMessage) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream)
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

          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/ogg" })
          const file = new File([audioBlob], `audio_${Date.now()}.ogg`, {
            type: "audio/ogg"
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

  const openTransfer = async () => {
    if (!selectedConversationId) return

    setTransferOpen(true)
    setTransferTo("")
    setAgents([])
    setAgentsLoading(true)

    try {
      const res = await fetch("/api/agents", {
        cache: "no-store"
      })

      if (!res.ok) {
        console.error("Erro ao buscar atendentes:", await res.text())
        setAgents([])
        return
      }

      const data: Agent[] = await res.json()
      setAgents(data ?? [])
    } catch (error) {
      console.error("Erro ao buscar atendentes:", error)
    } finally {
      setAgentsLoading(false)
    }
  }

  const confirmTransfer = async () => {
    if (!selectedConversationId || !transferTo) return

    try {
      setTransferSaving(true)

      const res = await fetch(`/api/conversations/${selectedConversationId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toUserId: transferTo
        })
      })

      if (!res.ok) {
        console.error("Erro ao transferir:", await res.text())
        return
      }

      setTransferOpen(false)
      await fetchMessages(selectedConversationId)
    } catch (error) {
      console.error("Erro ao transferir conversa:", error)
    } finally {
      setTransferSaving(false)
    }
  }

  const closeAttendance = async () => {
    if (!selectedConversationId || closingConversation) return

    try {
      setClosingConversation(true)

      const res = await fetch(`/api/conversations/${selectedConversationId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          byUserId: currentUser.id
        })
      })

      if (!res.ok) {
        console.error("Erro ao finalizar atendimento:", await res.text())
        return
      }

      onCloseConversation()
    } catch (error) {
      console.error("Erro ao finalizar atendimento:", error)
    } finally {
      setClosingConversation(false)
    }
  }

  const selectedAgentLabel = useMemo(() => {
    const agent = agents.find((item) => item.id === transferTo)
    if (!agent) return "Selecione um atendente"
    return `${agent.email} (${agent.role})`
  }, [agents, transferTo])

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
    if (!msg.quotedMessage) return null

    return (
      <div className="mb-2 rounded-xl border-l-4 border-green-400 bg-black/5 px-3 py-2">
        <div className="mb-1 flex items-center gap-1 text-[11px] font-medium text-gray-600">
          <Reply size={12} />
          <span>Respondendo</span>
        </div>
        <div className="text-xs text-gray-700 whitespace-pre-wrap break-words">
          {msg.quotedMessage}
        </div>
      </div>
    )
  }

  function renderMessageContent(msg: Message) {
    if (msg.type === "system" || msg.isSystem) {
      return null
    }

    if (msg.type === "revoked") {
      return (
        <div className="text-sm italic text-gray-500">
          🚫 Mensagem apagada
        </div>
      )
    }

    if (msg.type === "sticker") {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Sticker size={16} className="opacity-70" />
          <span>{msg.text || "Figurinha"}</span>
        </div>
      )
    }

    if (msg.type === "image") {
      if (msg.mediaUrl) {
        return (
          <div className="space-y-2">
            <img
              src={msg.mediaUrl}
              alt="Imagem"
              className="rounded-lg max-w-xs border border-black/5"
            />
            {!!msg.text && msg.text !== "📷 Imagem" && (
              <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
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
      if (msg.mediaUrl) {
        return (
          <div className="space-y-2">
            <video controls className="rounded-lg max-w-xs border border-black/5">
              <source src={msg.mediaUrl} />
            </video>
            {!!msg.text && msg.text !== "🎥 Vídeo" && (
              <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
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
      if (msg.mediaUrl) {
        return (
          <div className="flex items-center gap-2">
            <Mic size={16} className="opacity-70" />
            <audio controls className="w-64">
              <source src={msg.mediaUrl} />
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
      if (msg.mediaUrl) {
        return (
          <a
            href={msg.mediaUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-700 hover:underline"
          >
            <FileText size={16} className="opacity-70" />
            <span>{msg.text || "Baixar documento"}</span>
          </a>
        )
      }

      return (
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <FileText size={16} className="opacity-70" />
          <span>{msg.text || "Documento"}</span>
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

    if (msg.type === "location") {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <MapPin size={16} className="opacity-70" />
          <span>{msg.text || "Localização"}</span>
        </div>
      )
    }

    if (
      msg.type === "button_response" ||
      msg.type === "list_response" ||
      msg.type === "template_button_reply" ||
      msg.type === "interactive_response"
    ) {
      return (
        <div className="space-y-1">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">
            Resposta interativa
          </div>
          <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
        </div>
      )
    }

    if (msg.type === "edited") {
      return (
        <div className="space-y-1">
          <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
          <div className="text-[11px] italic text-gray-500">editada</div>
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
    "flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/54 text-slate-600 shadow-[0_8px_24px_rgba(148,163,184,0.12)] backdrop-blur-xl transition hover:bg-white/80 active:scale-[0.98] disabled:opacity-60 disabled:hover:bg-white/54"

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.26),rgba(243,251,249,0.4))]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 bottom-0 top-[24%] opacity-95">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(255,255,255,0.96),rgba(255,255,255,0)_30%),radial-gradient(circle_at_22%_42%,rgba(52,211,153,0.34),rgba(255,255,255,0)_18%),radial-gradient(circle_at_56%_76%,rgba(45,212,191,0.22),rgba(255,255,255,0)_24%),radial-gradient(circle_at_84%_44%,rgba(56,189,248,0.2),rgba(255,255,255,0)_18%)]" />
          <div className="absolute left-[12%] top-[14%] h-[26%] w-[26%] rounded-full bg-emerald-300/40 blur-[88px] mix-blend-screen" />
          <div className="absolute left-[10%] bottom-[6%] h-[24%] w-[38%] rounded-full bg-teal-300/18 blur-[92px] mix-blend-screen" />
          <div className="absolute right-[10%] bottom-[10%] h-[24%] w-[30%] rounded-full bg-sky-200/34 blur-[88px] mix-blend-screen" />
          <div className="absolute left-[24%] bottom-[16%] h-[12%] w-[30%] rounded-full bg-emerald-400/18 blur-[70px]" />
          <svg className="absolute bottom-[8%] left-0 h-[48%] w-full opacity-[0.99]" viewBox="0 0 1200 420" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="baleysWaveFront" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(52,211,153,0.72)" />
                <stop offset="25%" stopColor="rgba(45,212,191,0.68)" />
                <stop offset="52%" stopColor="rgba(56,189,248,0.62)" />
                <stop offset="76%" stopColor="rgba(134,239,172,0.54)" />
                <stop offset="100%" stopColor="rgba(248,250,255,0.42)" />
              </linearGradient>
              <linearGradient id="baleysWaveFrontUnderside" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(5,150,105,0.32)" />
                <stop offset="35%" stopColor="rgba(13,148,136,0.28)" />
                <stop offset="64%" stopColor="rgba(2,132,199,0.2)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
              </linearGradient>
              <linearGradient id="baleysWaveMid" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(52,211,153,0.38)" />
                <stop offset="35%" stopColor="rgba(45,212,191,0.34)" />
                <stop offset="70%" stopColor="rgba(56,189,248,0.3)" />
                <stop offset="100%" stopColor="rgba(167,243,208,0.22)" />
              </linearGradient>
              <linearGradient id="baleysWaveMidUnderside" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(16,185,129,0.18)" />
                <stop offset="36%" stopColor="rgba(13,148,136,0.16)" />
                <stop offset="72%" stopColor="rgba(2,132,199,0.12)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.04)" />
              </linearGradient>
              <linearGradient id="baleysWaveBack" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(52,211,153,0.18)" />
                <stop offset="40%" stopColor="rgba(45,212,191,0.16)" />
                <stop offset="72%" stopColor="rgba(56,189,248,0.14)" />
                <stop offset="100%" stopColor="rgba(167,243,208,0.1)" />
              </linearGradient>
              <linearGradient id="baleysWaveHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                <stop offset="36%" stopColor="rgba(255,255,255,0.82)" />
                <stop offset="62%" stopColor="rgba(255,255,255,0.36)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.04)" />
              </linearGradient>
              <filter id="baleysShadow" x="-20%" y="-20%" width="140%" height="160%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="16" result="blur" />
                <feOffset dy="18" result="offsetBlur" />
                <feColorMatrix
                  in="offsetBlur"
                  type="matrix"
                  values="0 0 0 0 0.14 0 0 0 0 0.64 0 0 0 0 0.58 0 0 0 0.16 0"
                  result="shadow"
                />
                <feBlend in="SourceGraphic" in2="shadow" mode="normal" />
              </filter>
              <filter id="baleysInnerGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="8" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <g opacity="0.84">
              <path d="M-42 334C58 340 122 302 212 302C326 302 382 388 494 388C626 388 656 188 814 188C940 188 1020 250 1238 272L1238 420L-42 420Z" fill="url(#baleysWaveBack)" />
            </g>
            <g filter="url(#baleysInnerGlow)" opacity="0.92">
              <path d="M-28 314C74 322 138 266 222 266C324 266 366 354 478 354C620 354 654 196 812 196C944 196 1018 238 1230 248L1230 420L-28 420Z" fill="url(#baleysWaveMidUnderside)" />
              <path d="M-24 300C76 308 140 256 220 256C320 256 358 352 476 352C620 352 650 186 810 186C944 186 1016 236 1230 244L1230 420L-24 420Z" fill="url(#baleysWaveMid)" />
            </g>
            <g filter="url(#baleysShadow)">
              <path d="M-14 302C92 302 152 232 238 232C344 232 384 332 500 332C642 332 672 136 826 136C956 136 1022 220 1228 226L1228 420L-14 420Z" fill="url(#baleysWaveFrontUnderside)" opacity="0.9" />
              <path d="M-18 284C84 284 144 220 232 220C336 220 364 330 486 330C640 330 660 114 822 114C958 114 1020 214 1226 220L1226 420L-18 420Z" fill="url(#baleysWaveFront)" />
            </g>
            <path d="M-6 270C96 270 150 210 240 210C342 210 370 320 492 320C644 320 664 102 824 102C958 102 1024 206 1212 212" fill="none" stroke="url(#baleysWaveHighlight)" strokeWidth="10" strokeLinecap="round" />
            <path d="M16 286C114 286 164 238 246 238C338 238 376 318 490 318C630 318 666 124 818 124C944 124 1016 208 1186 214" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="4" strokeLinecap="round" />
          </svg>
          <div className="absolute bottom-[9%] left-[8%] h-32 w-80 opacity-40 [background-image:radial-gradient(circle,rgba(255,255,255,0.42)_1px,transparent_1.5px)] [background-size:10px_10px] [mask-image:radial-gradient(circle_at_18%_55%,rgba(0,0,0,1),rgba(0,0,0,0.42),transparent_78%)]" />
        </div>
      </div>

      <div className="relative z-10 flex h-16 items-center justify-between border-b border-white/60 bg-white/36 px-4 backdrop-blur-xl">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">
            {selectedConversationId ? "Conversa selecionada" : "Selecione uma conversa"}
          </div>
          <div className="truncate text-xs text-slate-500">
            {selectedConversationId ?? ""}
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
            title="Finalizar atendimento"
            disabled={!selectedConversationId || transferSaving || closingConversation}
          >
            <CircleStop size={20} />
          </button>
        </div>
      </div>

      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
        {!selectedConversationId ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-slate-600">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-white/70 bg-white/70 shadow-[0_10px_24px_rgba(148,163,184,0.14)]">
                <MessageSquare size={22} className="opacity-70" />
              </div>
              <div className="font-medium">Selecione uma conversa</div>
              <div className="text-sm opacity-70">As mensagens aparecerão aqui.</div>
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
                    {outbound && msg.agentName && (
                      <div className="mb-1 px-1 text-xs font-semibold text-slate-700">
                        {msg.agentName}:
                      </div>
                    )}

                    <div
                      className={`rounded-[24px] border px-3.5 py-2.5 shadow-[0_12px_32px_rgba(148,163,184,0.12)] backdrop-blur-xl ${
                        outbound
                          ? "border-emerald-200/70 bg-[linear-gradient(135deg,rgba(220,252,231,0.92),rgba(207,250,254,0.8))]"
                          : "border-white/70 bg-white/70"
                      }`}
                    >
                      {renderQuotedMessage(msg)}
                      {renderMessageContent(msg)}

                      <div className="mt-1 flex items-center justify-end gap-1 text-[10px] leading-none text-slate-500">
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

      <div className="relative z-10 border-t border-white/60 bg-white/34 px-3 py-2 backdrop-blur-xl">
        {!isRecording ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={iconBtn}
              title="Anexar"
              disabled={!selectedConversationId || sendingMedia || sendingMessage}
            >
              <Paperclip size={20} />
            </button>

            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className={iconBtn}
              title="Imagem"
              disabled={!selectedConversationId || sendingMedia || sendingMessage}
            >
              <ImageIcon size={20} />
            </button>

            <div className="flex-1">
              <textarea
                className="min-h-[42px] max-h-32 w-full resize-none overflow-y-auto rounded-2xl border border-white/70 bg-white/70 px-4 py-2.5 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-cyan-200 focus:bg-white disabled:opacity-60"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={
                  selectedConversationId ? "Digite uma mensagem" : "Selecione uma conversa"
                }
                disabled={!selectedConversationId || sendingMessage}
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    if (!sendingMessage) {
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
                disabled={!selectedConversationId || sendingMedia || sendingMessage}
              >
                <Mic size={20} />
              </button>
            ) : (
              <button
                type="button"
                onClick={sendMessage}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(16,185,129,0.94),rgba(34,211,238,0.92))] text-white shadow-[0_14px_28px_rgba(45,212,191,0.28)] transition hover:scale-[1.02] disabled:opacity-60"
                title="Enviar"
                disabled={!selectedConversationId || sendingMessage}
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

            <div className="flex h-10 flex-1 items-center gap-3 rounded-full border border-white/70 bg-white/72 px-4 shadow-[0_8px_24px_rgba(148,163,184,0.12)]">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              <div className="text-sm font-medium text-gray-700 tabular-nums">
                {formatRecordTime(recordTime)}
              </div>

              <div className="flex-1 flex items-center gap-1 opacity-70">
                <span className="w-1 h-2 bg-gray-400 rounded-full animate-pulse" />
                <span className="w-1 h-3 bg-gray-400 rounded-full animate-pulse" />
                <span className="w-1 h-5 bg-gray-400 rounded-full animate-pulse" />
                <span className="w-1 h-3 bg-gray-400 rounded-full animate-pulse" />
                <span className="w-1 h-2 bg-gray-400 rounded-full animate-pulse" />
              </div>
            </div>

            <button
              type="button"
              onClick={stopRecording}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(16,185,129,0.94),rgba(34,211,238,0.92))] text-white shadow-[0_14px_28px_rgba(45,212,191,0.28)] transition hover:scale-[1.02] disabled:opacity-60"
              title="Enviar áudio"
              disabled={sendingMedia}
            >
              <Send size={18} />
            </button>
          </div>
        )}
      </div>

      {transferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/24 p-4 backdrop-blur-sm">
          <div className="w-[520px] max-w-[96vw] overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(244,251,250,0.86))] shadow-[0_32px_90px_rgba(148,163,184,0.18)]">
            <div className="flex items-center justify-between border-b border-white/60 px-5 py-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">Transferir conversa</div>
                <div className="text-xs text-slate-500">
                  Selecione o atendente que vai assumir
                </div>
              </div>

              <button
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/60 hover:bg-white/84"
                onClick={() => setTransferOpen(false)}
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 p-5">
              <label className="text-xs text-slate-500">Atendente</label>

              <select
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                className="h-11 w-full rounded-2xl border border-white/70 bg-white/76 px-4 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-100"
                disabled={agentsLoading || transferSaving}
              >
                <option value="">
                  {agentsLoading ? "Carregando atendentes..." : "Selecione um atendente"}
                </option>

                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.email} ({a.role})
                  </option>
                ))}
              </select>

              {!agentsLoading && agents.length === 0 && (
                <div className="text-xs text-slate-500">Nenhum atendente encontrado.</div>
              )}

              {!!transferTo && (
                <div className="text-xs text-slate-500">
                  Selecionado:{" "}
                  <span className="font-medium text-slate-700">{selectedAgentLabel}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  className="rounded-2xl border border-white/70 bg-white/72 px-4 py-2 text-slate-700 hover:bg-white"
                  onClick={() => setTransferOpen(false)}
                  disabled={transferSaving}
                >
                  Cancelar
                </button>

                <button
                  className="rounded-2xl bg-[linear-gradient(135deg,rgba(16,185,129,0.94),rgba(34,211,238,0.92))] px-4 py-2 text-white shadow-[0_14px_28px_rgba(45,212,191,0.28)] disabled:opacity-60"
                  onClick={confirmTransfer}
                  disabled={!transferTo || transferSaving}
                >
                  {transferSaving ? "Transferindo..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
