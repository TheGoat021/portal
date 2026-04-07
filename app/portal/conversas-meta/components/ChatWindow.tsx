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
  UserRound
} from "lucide-react"
import { supabase } from "@/lib/supabaseClient"

interface Props {
  selectedConversationId: string | null
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

export default function ChatWindow({ selectedConversationId }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [conversation, setConversation] = useState<MetaConversation | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [recordTime, setRecordTime] = useState(0)
  const [loading, setLoading] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)

  const recordIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  function formatTime(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleTimeString("pt-BR", {
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
        fileName: msg.file_name || null
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
          message: messageToSend
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

  const stopRecording = () => {
    setIsRecording(false)
    setRecordTime(0)
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current)
  }

  const cancelRecording = () => {
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
      if (msg.mediaUrl) {
        return (
          <div className="space-y-2">
            <video controls className="rounded-lg max-w-xs border border-black/5">
              <source src={msg.mediaUrl} />
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

  const iconBtn =
    "h-10 w-10 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition disabled:opacity-60 disabled:hover:bg-transparent"

  const conversationLabel =
    conversation?.contact_name ||
    conversation?.profile_name ||
    conversation?.wa_id ||
    "Conversa selecionada"

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#EFEAE2]">
      <div className="h-14 px-3 flex items-center justify-between border-b bg-white">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate">
            {selectedConversationId ? conversationLabel : "Selecione uma conversa"}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {conversation?.wa_id ?? selectedConversationId ?? ""}
          </div>
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
              <div className="text-sm opacity-70">As mensagens da Meta aparecerão aqui.</div>
            </div>
          </div>
        ) : (
          <>
            {loading && messages.length === 0 && (
              <div className="text-sm text-gray-500">Carregando mensagens...</div>
            )}

            {messages.map((msg) => {
              const outbound = msg.direction === "outbound"

              return (
                <div
                  key={msg.id}
                  className={`flex ${outbound ? "justify-end" : "justify-start"}`}
                >
                  <div className="max-w-[75%]">
                    <div
                      className={`rounded-2xl px-3 py-2 shadow-sm border border-black/5 ${
                        outbound ? "bg-[#D9FDD3]" : "bg-white"
                      }`}
                    >
                      {renderQuotedMessage(msg)}
                      {renderMessageContent(msg)}

                      <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-gray-500 leading-none">
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

      <div className="border-t bg-white px-3 py-2">
        {!isRecording ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={iconBtn}
              title="Anexar"
              disabled
            >
              <Paperclip size={20} />
            </button>

            <button
              type="button"
              className={iconBtn}
              title="Imagem"
              disabled
            >
              <ImageIcon size={20} />
            </button>

            <div className="flex-1">
              <textarea
                className="w-full min-h-[40px] max-h-32 px-4 py-2 rounded-2xl bg-gray-100 border border-transparent focus:border-gray-200 focus:bg-white outline-none disabled:opacity-60 resize-none overflow-y-auto"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={
                  selectedConversationId ? "Digite uma mensagem" : "Selecione uma conversa"
                }
                disabled={!selectedConversationId || !conversation || sendingMessage}
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
                onClick={() => {
                  setIsRecording(true)
                  if (recordIntervalRef.current) clearInterval(recordIntervalRef.current)
                  recordIntervalRef.current = setInterval(() => {
                    setRecordTime((prev) => prev + 1)
                  }, 1000)
                }}
                className={iconBtn}
                title="Gravar áudio"
                disabled
              >
                <Mic size={20} />
              </button>
            ) : (
              <button
                type="button"
                onClick={sendMessage}
                className="h-10 w-10 rounded-full flex items-center justify-center bg-green-500 text-white hover:bg-green-600 active:bg-green-700 transition disabled:opacity-60"
                title="Enviar"
                disabled={!selectedConversationId || !conversation || sendingMessage}
              >
                <Send size={18} />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={cancelRecording}
              className={iconBtn}
              title="Cancelar"
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
              disabled
            >
              <Send size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}