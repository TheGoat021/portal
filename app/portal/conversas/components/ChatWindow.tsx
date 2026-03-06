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
  MessageSquare
} from "lucide-react"

interface Props {
  selectedConversationId: string | null
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
  type?: "text" | "image" | "audio" | "document" | "system"
  media_url?: string | null
  agent_name?: string | null
  is_system?: boolean
}

interface Message {
  id: string
  text: string
  direction: "inbound" | "outbound"
  createdAt: string
  type: "text" | "image" | "audio" | "document" | "system"
  mediaUrl?: string | null
  agentName?: string | null
  isSystem?: boolean
}

type Agent = {
  id: string
  email: string
  role: string
}

export default function ChatWindow({ selectedConversationId, currentUser }: Props) {
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

  const recordIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

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
        isSystem: Boolean(msg.is_system) || msg.type === "system"
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

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        try {
          if (audioChunksRef.current.length === 0) return

          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/ogg" })
          const file = new File([audioBlob], `audio_${Date.now()}.ogg`, {
            type: "audio/ogg"
          })

          await sendMedia(file)
        } finally {
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
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current)
  }

  const cancelRecording = () => {
    audioChunksRef.current = []
    mediaRecorderRef.current?.stop()
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

  const selectedAgentLabel = useMemo(() => {
    const agent = agents.find((item) => item.id === transferTo)
    if (!agent) return "Selecione um atendente"
    return `${agent.email} (${agent.role})`
  }, [agents, transferTo])

  function renderMessageContent(msg: Message) {
    if (msg.type === "system" || msg.isSystem) {
      return null
    }

    if (msg.type === "image") {
      if (msg.mediaUrl) {
        return (
          <img
            src={msg.mediaUrl}
            alt="Imagem"
            className="rounded-lg max-w-xs border border-black/5"
          />
        )
      }

      return (
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <ImageIcon size={16} className="opacity-70" />
          <span>Imagem</span>
        </div>
      )
    }

    if (msg.type === "audio") {
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
          <span>Áudio</span>
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
          <span>Documento</span>
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
    "h-10 w-10 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition disabled:opacity-60 disabled:hover:bg-transparent"

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#EFEAE2]">
      <div className="h-14 px-3 flex items-center justify-between border-b bg-white">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate">
            {selectedConversationId ? "Conversa selecionada" : "Selecione uma conversa"}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {selectedConversationId ?? ""}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={openTransfer}
            className={iconBtn}
            title="Transferir para outro atendente"
            disabled={!selectedConversationId || transferSaving}
          >
            <Users size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-2">
        {!selectedConversationId ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-600">
              <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-white/70 flex items-center justify-center border border-black/5">
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
                      <div className="px-1 mb-1 text-xs font-semibold text-gray-700">
                        {msg.agentName}:
                      </div>
                    )}

                    <div
                      className={`rounded-2xl px-3 py-2 shadow-sm border border-black/5 ${
                        outbound ? "bg-[#D9FDD3]" : "bg-white"
                      }`}
                    >
                      {renderMessageContent(msg)}

                      <div className="mt-1 text-[10px] text-gray-500 text-right leading-none">
                        {formatTime(msg.createdAt)}
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

      <div className="border-t bg-white px-3 py-2">
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
                className="w-full min-h-[40px] max-h-32 px-4 py-2 rounded-2xl bg-gray-100 border border-transparent focus:border-gray-200 focus:bg-white outline-none disabled:opacity-60 resize-none overflow-y-auto"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={selectedConversationId ? "Digite uma mensagem" : "Selecione uma conversa"}
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
                className="h-10 w-10 rounded-full flex items-center justify-center bg-green-500 text-white hover:bg-green-600 active:bg-green-700 transition disabled:opacity-60"
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

            <div className="flex-1 h-10 rounded-full bg-gray-100 px-4 flex items-center gap-3 border border-black/5">
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
              className="h-10 w-10 rounded-full flex items-center justify-center bg-green-500 text-white hover:bg-green-600 active:bg-green-700 transition disabled:opacity-60"
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
          <div className="w-[520px] max-w-[96vw] bg-white rounded-2xl shadow-xl border border-black/5 overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Transferir conversa</div>
                <div className="text-xs text-gray-500">
                  Selecione o atendente que vai assumir
                </div>
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
              <label className="text-xs text-gray-500">Atendente</label>

              <select
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
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
                <div className="text-xs text-gray-500">Nenhum atendente encontrado.</div>
              )}

              {!!transferTo && (
                <div className="text-xs text-gray-500">
                  Selecionado: <span className="font-medium text-gray-700">{selectedAgentLabel}</span>
                </div>
              )}

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