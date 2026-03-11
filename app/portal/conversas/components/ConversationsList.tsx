"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  FileText,
  Image as ImageIcon,
  Mic,
  MessageSquare,
  MapPin,
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

interface BackendConversation {
  id: string
  phone: string
  name?: string | null
  lastMessage?: string
  last_message?: string
  lastMessageAt?: string | null
  last_message_at?: string | null
  agentId?: string | null
  agent_id?: string | null
  agentName?: string | null
  agent_name?: string | null
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
    | "revoked"
    | "edited"
    | "button_response"
    | "list_response"
    | "template_button_reply"
    | "interactive_response"
    | "unknown"
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
    | "revoked"
    | "edited"
    | "button_response"
    | "list_response"
    | "template_button_reply"
    | "interactive_response"
    | "unknown"
}

interface Conversation {
  id: string
  phone: string
  name?: string | null
  lastMessage: string
  lastMessageAt?: string
  agentId?: string | null
  agentName?: string | null
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
    | "revoked"
    | "edited"
    | "button_response"
    | "list_response"
    | "template_button_reply"
    | "interactive_response"
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

function toTs(dateString?: string) {
  if (!dateString) return 0
  const t = new Date(dateString).getTime()
  return Number.isFinite(t) ? t : 0
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
        icon: <MapPin size={14} className="opacity-70 shrink-0" />,
        text: "Localização"
      }

    case "button_response":
    case "list_response":
    case "template_button_reply":
    case "interactive_response":
      return {
        icon: <MessageSquare size={14} className="opacity-70 shrink-0" />,
        text: text || "Resposta interativa"
      }

    case "revoked":
      return {
        icon: <MessageSquare size={14} className="opacity-70 shrink-0" />,
        text: "🚫 Mensagem apagada"
      }

    case "edited":
      return {
        icon: <MessageSquare size={14} className="opacity-70 shrink-0" />,
        text: text ? `${text} · editada` : "Mensagem editada"
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
  onSelectConversation,
  currentUser
}: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [showModal, setShowModal] = useState(false)
  const [newPhone, setNewPhone] = useState("")
  const [newMessage, setNewMessage] = useState("")
  const [search, setSearch] = useState("")

  const roleUpper = (currentUser.role || "").toUpperCase()
  const isDiretoria =
    roleUpper === "DIRETORIA" ||
    roleUpper === "ADMINISTRAÇÃO" ||
    roleUpper === "ADMINISTRACAO" ||
    roleUpper === "ADMIN"

  const [lastSeenAtById, setLastSeenAtById] = useState<Record<string, number>>({})
  const selectedRef = useRef<string | null>(null)

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/conversations", { cache: "no-store" })
      if (!res.ok) {
        console.error("Erro ao buscar conversas:", await res.text())
        return
      }

      const data: BackendConversation[] = await res.json()

      const mapped: Conversation[] = (data ?? []).map((conv) => ({
        id: String(conv.id),
        phone: conv.phone,
        name: conv.name ?? null,
        lastMessage: conv.lastMessage ?? conv.last_message ?? "",
        lastMessageAt: conv.lastMessageAt ?? conv.last_message_at ?? undefined,
        agentId: conv.agentId ?? conv.agent_id ?? null,
        agentName: conv.agentName ?? conv.agent_name ?? null,
        lastMessageType: conv.lastMessageType ?? conv.last_message_type ?? "text"
      }))

      const selectedId = selectedRef.current
      if (selectedId) {
        const openConv = mapped.find((c) => c.id === selectedId)
        if (openConv?.lastMessageAt) {
          const ts = toTs(openConv.lastMessageAt)
          if (ts) {
            setLastSeenAtById((prev) => {
              const cur = prev[selectedId] ?? 0
              if (ts <= cur) return prev
              return { ...prev, [selectedId]: ts }
            })
          }
        }
      }

      setConversations(mapped)
    } catch (error) {
      console.error("Erro ao buscar conversas", error)
    }
  }

  useEffect(() => {
    fetchConversations()
    const interval = setInterval(fetchConversations, 3000)
    return () => clearInterval(interval)
  }, [currentUser.id, currentUser.role])

  useEffect(() => {
    selectedRef.current = selectedConversationId
  }, [selectedConversationId])

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase()

    let base = conversations

    if (!isDiretoria) {
      base = base.filter((c) => !c.agentId || c.agentId === currentUser.id)
    }

    if (!q) return base

    return base.filter((c) => {
      const name = (c.name || "").toLowerCase()
      const phone = (c.phone || "").toLowerCase()
      const last = (c.lastMessage || "").toLowerCase()
      const agent = (c.agentName || "").toLowerCase()

      return (
        name.includes(q) ||
        phone.includes(q) ||
        last.includes(q) ||
        agent.includes(q)
      )
    })
  }, [conversations, search, isDiretoria, currentUser.id])

  const handleCreateConversation = async () => {
    if (!newPhone || !newMessage) return

    try {
      const res = await fetch("https://apiwhats.drdetodos.com.br/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: newPhone,
          message: newMessage,
          userId: currentUser.id,
          role: roleUpper
        })
      })

      if (!res.ok) {
        console.error("Erro ao criar conversa:", await res.text())
        return
      }

      setNewPhone("")
      setNewMessage("")
      setShowModal(false)

      await fetchConversations()
    } catch (error) {
      console.error("Erro ao criar conversa", error)
    }
  }

  const handleSelectConversation = async (conv: Conversation) => {
    try {
      if (!isDiretoria) {
        if (conv.agentId && conv.agentId !== currentUser.id) {
          alert("Essa conversa já está sendo atendida por outro usuário.")
          return
        }

        if (!conv.agentId) {
          const res = await fetch(
            `https://apiwhats.drdetodos.com.br/conversations/${conv.id}/lock`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: currentUser.id,
                role: roleUpper
              })
            }
          )

          if (!res.ok) {
            alert("Não foi possível assumir a conversa.")
            return
          }

          await fetchConversations()
        }
      }

      const ts = toTs(conv.lastMessageAt)
      if (ts) {
        setLastSeenAtById((prev) => {
          const cur = prev[conv.id] ?? 0
          if (ts <= cur) return prev
          return { ...prev, [conv.id]: ts }
        })
      }

      onSelectConversation(conv.id)
    } catch (error) {
      console.error("Erro ao selecionar conversa", error)
    }
  }

  return (
    <div className="relative min-h-0">
      <div className="p-3 border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <input
            placeholder="Buscar por nome, telefone ou mensagem..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white outline-none"
          />
          <button
            onClick={() => setShowModal(true)}
            className="w-10 h-10 rounded-xl bg-green-500 text-white hover:bg-green-600 transition flex items-center justify-center"
            title="Nova conversa"
          >
            +
          </button>
        </div>
      </div>

      <div className="min-h-0">
        {filteredConversations.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">Nenhuma conversa encontrada.</div>
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = selectedConversationId === conv.id

            const isLockedByOther =
              !isDiretoria && !!conv.agentId && conv.agentId !== currentUser.id

            const title = conv.name?.trim() ? conv.name : conv.phone
            const subtitle = conv.name?.trim() ? conv.phone : ""
            const time = formatListTime(conv.lastMessageAt)
            const initials = getInitials(title)

            const lastSeenTs = lastSeenAtById[conv.id] ?? 0
            const lastMsgTs = toTs(conv.lastMessageAt)
            const hasNew = !isSelected && lastMsgTs > 0 && lastMsgTs > lastSeenTs

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

                        {conv.agentName ? (
                          <div className="text-[11px] text-gray-400 truncate mt-0.5">
                            Atendente: {conv.agentName}
                          </div>
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
                              className="w-2.5 h-2.5 rounded-full bg-green-500"
                              title="Nova mensagem"
                            />
                          ) : null}
                        </div>

                        {isLockedByOther ? (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
                            Em atendimento
                          </span>
                        ) : null}
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
            <h2 className="text-lg font-semibold text-gray-900">Nova conversa</h2>

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
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateConversation}
                className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}