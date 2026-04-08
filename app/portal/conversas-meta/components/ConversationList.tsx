// app/portal/conversas-meta/components/ConversationsList.tsx

"use client"

import { useEffect, useMemo, useState } from "react"
import {
  FileText,
  Image as ImageIcon,
  Mic,
  MessageSquare,
  UserRound,
  Video
} from "lucide-react"

interface Props {
  selectedConversationId: string | null
  onSelectConversation: (id: string) => void
  currentUser: {
    id: string
    role: string
  }
}

interface MetaConnection {
  id: string
  display_phone_number?: string | null
  verified_name?: string | null
  status?: string | null
}

interface BackendConversation {
  id: string
  wa_id: string
  contact_name?: string | null
  profile_name?: string | null
  last_message?: string | null
  last_message_at?: string | null
  last_message_type?:
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
  unread_count?: number | null
  connection_id: string
}

interface Conversation {
  id: string
  phone: string
  name?: string | null
  profileName?: string | null
  lastMessage: string
  lastMessageAt?: string
  unreadCount: number
  connectionId: string
  lastMessageType?:
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
}

function formatListTime(dateString?: string) {
  if (!dateString) return ""
  const d = new Date(dateString)
  const now = new Date()

  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()

  if (sameDay) {
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  }

  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

function getInitials(nameOrPhone: string) {
  const cleaned = (nameOrPhone || "").trim()
  if (!cleaned) return "?"
  const parts = cleaned.split(" ").filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return cleaned.replace(/\D/g, "").slice(-2) || cleaned.slice(0, 2).toUpperCase()
}

function normalizePhone(phone?: string | null) {
  if (!phone) return ""
  return String(phone).replace(/\D/g, "")
}

function getConversationPreview(conv: Conversation) {
  const text = conv.lastMessage || ""

  switch (conv.lastMessageType) {
    case "image":
      return {
        icon: <ImageIcon size={14} className="opacity-70 shrink-0" />,
        text: text && text !== "📷 Imagem" ? text : "Imagem"
      }

    case "video":
      return {
        icon: <Video size={14} className="opacity-70 shrink-0" />,
        text: text && text !== "🎥 Vídeo" ? text : "Vídeo"
      }

    case "audio":
    case "ptt":
      return {
        icon: <Mic size={14} className="opacity-70 shrink-0" />,
        text: "Áudio"
      }

    case "document":
      return {
        icon: <FileText size={14} className="opacity-70 shrink-0" />,
        text: text || "Documento"
      }

    case "sticker":
      return {
        icon: <MessageSquare size={14} className="opacity-70 shrink-0" />,
        text: "Figurinha"
      }

    case "contact":
      return {
        icon: <UserRound size={14} className="opacity-70 shrink-0" />,
        text: text || "Contato"
      }

    case "location":
      return {
        icon: <MessageSquare size={14} className="opacity-70 shrink-0" />,
        text: "Localização"
      }

    default:
      return {
        icon: null,
        text: text || "—"
      }
  }
}

export default function ConversationsList({
  selectedConversationId,
  onSelectConversation
}: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [connections, setConnections] = useState<MetaConnection[]>([])
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>("")
  const [showModal, setShowModal] = useState(false)
  const [newPhone, setNewPhone] = useState("")
  const [newMessage, setNewMessage] = useState("")
  const [search, setSearch] = useState("")
  const [loadingConnections, setLoadingConnections] = useState(false)
  const [creatingConversation, setCreatingConversation] = useState(false)


  const fetchConnections = async () => {
    try {
      setLoadingConnections(true)

      const res = await fetch("/api/meta/embedded-signup/connections", {
        cache: "no-store"
      })

      if (!res.ok) {
        console.error("Erro ao buscar conexões Meta:", await res.text())
        return
      }

      const payload = await res.json()
      const items: MetaConnection[] = payload?.data ?? []

      setConnections(items)

      if (!selectedConnectionId && items.length > 0) {
        setSelectedConnectionId(items[0].id)
      }
    } catch (error) {
      console.error("Erro ao buscar conexões Meta:", error)
    } finally {
      setLoadingConnections(false)
    }
  }

  const fetchConversations = async (connectionId?: string) => {
    try {
      const activeConnectionId = connectionId || selectedConnectionId

      if (!activeConnectionId) {
        setConversations([])
        return
      }

      const res = await fetch(
        `/api/whatsapp-meta/conversations?connectionId=${encodeURIComponent(activeConnectionId)}`,
        { cache: "no-store" }
      )

      if (!res.ok) {
        console.error("Erro ao buscar conversas meta:", await res.text())
        return
      }

      const payload = await res.json()
      const data: BackendConversation[] = payload?.data ?? []

      const mapped: Conversation[] = (data ?? []).map((conv) => ({
        id: String(conv.id),
        phone: conv.wa_id,
        name: conv.contact_name ?? null,
        profileName: conv.profile_name ?? null,
        lastMessage: conv.last_message ?? "",
        lastMessageAt: conv.last_message_at ?? undefined,
        unreadCount: Number(conv.unread_count ?? 0),
        connectionId: conv.connection_id,
        lastMessageType: conv.last_message_type ?? "text"
      }))

      setConversations(mapped)
    } catch (error) {
      console.error("Erro ao buscar conversas meta", error)
    }
  }

  useEffect(() => {
    fetchConnections()
  }, [])

  useEffect(() => {
    if (!selectedConnectionId) {
      setConversations([])
      return
    }

    fetchConversations(selectedConnectionId)
    const interval = setInterval(() => fetchConversations(selectedConnectionId), 3000)
    return () => clearInterval(interval)
  }, [selectedConnectionId])

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = conversations

    if (!q) return base

    return base.filter((c) => {
      const name = (c.name || "").toLowerCase()
      const profileName = (c.profileName || "").toLowerCase()
      const phone = (c.phone || "").toLowerCase()
      const last = (c.lastMessage || "").toLowerCase()

      return (
        name.includes(q) ||
        profileName.includes(q) ||
        phone.includes(q) ||
        last.includes(q)
      )
    })
  }, [conversations, search])

  const handleCreateConversation = async () => {
    if (!selectedConnectionId || !newPhone.trim() || !newMessage.trim() || creatingConversation) {
      return
    }

    try {
      setCreatingConversation(true)

      const normalizedPhone = normalizePhone(newPhone)

      const connection = connections.find((item) => item.id === selectedConnectionId)
      if (!connection) {
        console.error("Conexão Meta não encontrada")
        return
      }

      const ensureConversationRes = await fetch("/api/whatsapp-meta/conversations/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          connectionId: selectedConnectionId,
          waId: normalizedPhone,
          contactName: null,
          profileName: connection.display_phone_number || connection.verified_name || null
        })
      })

      if (!ensureConversationRes.ok) {
        console.error("Erro ao criar conversa meta:", await ensureConversationRes.text())
        return
      }

      const ensureConversationPayload = await ensureConversationRes.json()
      const conversationId = ensureConversationPayload?.data?.id

      if (!conversationId) {
        console.error("ConversationId não retornado")
        return
      }

      const sendRes = await fetch("/api/whatsapp-meta/send-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionId: selectedConnectionId,
          conversationId,
          to: normalizedPhone,
          text: newMessage.trim()
        })
      })

      if (!sendRes.ok) {
        console.error("Erro ao enviar mensagem inicial meta:", await sendRes.text())
        return
      }

      setNewPhone("")
      setNewMessage("")
      setShowModal(false)

      await fetchConversations(selectedConnectionId)
      onSelectConversation(conversationId)
    } catch (error) {
      console.error("Erro ao criar conversa meta", error)
    } finally {
      setCreatingConversation(false)
    }
  }

  const handleSelectConversation = async (conv: Conversation) => {
    try {
      onSelectConversation(conv.id)

      await fetch(`/api/whatsapp-meta/conversations/${conv.id}/read`, {
        method: "POST"
      })

      setConversations((prev) =>
        prev.map((item) =>
          item.id === conv.id ? { ...item, unreadCount: 0 } : item
        )
      )
    } catch (error) {
      console.error("Erro ao selecionar conversa meta", error)
    }
  }

  const selectedConnection = connections.find((item) => item.id === selectedConnectionId)

  return (
    <div className="relative min-h-0">
      <div className="p-3 border-b border-gray-100 bg-white sticky top-0 z-10 space-y-2">
        <div>
          <select
            value={selectedConnectionId}
            onChange={(e) => {
              setSelectedConnectionId(e.target.value)
              onSelectConversation("")
            }}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white outline-none"
            disabled={loadingConnections}
          >
            <option value="">
              {loadingConnections ? "Carregando conexões..." : "Selecione uma conexão Meta"}
            </option>

            {connections.map((connection) => (
              <option key={connection.id} value={connection.id}>
                {connection.display_phone_number || connection.verified_name || connection.id}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            placeholder="Buscar por nome, telefone ou mensagem..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white outline-none"
          />
          <button
            onClick={() => setShowModal(true)}
            className="w-10 h-10 rounded-xl bg-green-500 text-white hover:bg-green-600 transition flex items-center justify-center disabled:opacity-60"
            title="Nova conversa Meta"
            disabled={!selectedConnectionId}
          >
            +
          </button>
        </div>

        {selectedConnection ? (
          <div className="text-[11px] text-gray-500 px-1">
            Conexão ativa:{" "}
            <span className="font-medium text-gray-700">
              {selectedConnection.display_phone_number ||
                selectedConnection.verified_name ||
                selectedConnection.id}
            </span>
          </div>
        ) : null}
      </div>

      <div className="min-h-0">
        {!selectedConnectionId ? (
          <div className="p-6 text-sm text-gray-500">
            Selecione uma conexão Meta para ver as conversas.
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">Nenhuma conversa encontrada.</div>
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = selectedConversationId === conv.id

            const title =
              conv.name?.trim() || conv.profileName?.trim() || conv.phone
            const subtitle =
              conv.name?.trim() || conv.profileName?.trim() ? conv.phone : ""
            const time = formatListTime(conv.lastMessageAt)
            const initials = getInitials(title)

            const hasNew =
              !isSelected &&
              (conv.unreadCount ?? 0) > 0

            const preview = getConversationPreview(conv)

            return (
              <button
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                className={[
                  "w-full text-left px-4 py-3 border-b border-gray-100 transition",
                  isSelected ? "bg-gray-50" : "hover:bg-gray-50"
                ].join(" ")}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-700 shrink-0">
                    {initials}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div
                          className={[
                            "truncate",
                            hasNew ? "font-bold text-gray-900" : "font-semibold text-gray-900"
                          ].join(" ")}
                        >
                          {title}
                        </div>

                        {subtitle ? (
                          <div className="text-xs text-gray-500 truncate">{subtitle}</div>
                        ) : null}
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex items-center gap-2">
                          <div
                            className={[
                              "text-xs",
                              hasNew ? "text-gray-800 font-semibold" : "text-gray-400"
                            ].join(" ")}
                          >
                            {time}
                          </div>

                          {hasNew ? (
                            <span
                              className="min-w-[18px] h-[18px] px-1 rounded-full bg-green-500 text-white text-[10px] flex items-center justify-center"
                              title="Novas mensagens"
                            >
                              {conv.unreadCount > 9 ? "9+" : conv.unreadCount || "•"}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div
                      className={[
                        "text-sm truncate mt-1 flex items-center gap-1.5",
                        hasNew ? "text-gray-900 font-semibold" : "text-gray-600"
                      ].join(" ")}
                    >
                      {preview.icon}
                      <span className="truncate">{preview.text}</span>
                    </div>
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl w-[420px] max-w-[92vw] space-y-4 shadow-xl border border-black/5">
            <h2 className="text-lg font-semibold text-gray-900">Nova conversa Meta</h2>

            <input
              placeholder="Telefone (5511999999999)"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none bg-gray-50 focus:bg-white"
            />

            <textarea
              placeholder="Mensagem inicial..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none bg-gray-50 focus:bg-white min-h-[96px]"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50"
                disabled={creatingConversation}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateConversation}
                className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-60"
                disabled={creatingConversation || !selectedConnectionId}
              >
                {creatingConversation ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
