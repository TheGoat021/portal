"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Archive,
  FileText,
  Headset,
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
  serviceState?: "open" | "closed"
  service_state?: "open" | "closed"
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
  serviceState: "open" | "closed"
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
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>("open")

  const roleUpper = (currentUser.role || "").toUpperCase()
  const isDiretoria =
    roleUpper === "DIRETORIA" ||
    roleUpper === "ADMINISTRAÇÃO" ||
    roleUpper === "ADMINISTRACAO" ||
    roleUpper === "ADMIN"

  const seenStorageKey = `conversations-last-seen:${currentUser.id}`
  const [lastSeenAtById, setLastSeenAtById] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {}

    try {
      const raw = localStorage.getItem(seenStorageKey)
      if (!raw) return {}

      const parsed = JSON.parse(raw) as Record<string, number>
      return parsed && typeof parsed === "object" ? parsed : {}
    } catch {
      return {}
    }
  })
  const selectedRef = useRef<string | null>(null)

  function setSeenAt(conversationId: string, ts: number) {
    if (!conversationId || !ts) return

    setLastSeenAtById((prev) => {
      const current = prev[conversationId] ?? 0
      if (ts <= current) return prev

      const next = { ...prev, [conversationId]: ts }
      try {
        localStorage.setItem(seenStorageKey, JSON.stringify(next))
      } catch {}
      return next
    })
  }

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
        serviceState: conv.serviceState ?? conv.service_state ?? "open",
        lastMessageType: conv.lastMessageType ?? conv.last_message_type ?? "text"
      }))

      const selectedId = selectedRef.current
      if (selectedId) {
        const openConv = mapped.find((c) => c.id === selectedId)
        if (openConv?.lastMessageAt) {
          const ts = toTs(openConv.lastMessageAt)
          if (ts) setSeenAt(selectedId, ts)
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

    let base = conversations.filter((conversation) => conversation.serviceState === serviceFilter)

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
  }, [conversations, search, isDiretoria, currentUser.id, serviceFilter])

  const countBase = useMemo(() => {
    if (isDiretoria) return conversations
    return conversations.filter((conversation) => !conversation.agentId || conversation.agentId === currentUser.id)
  }, [conversations, isDiretoria, currentUser.id])

  const openCount = useMemo(
    () => countBase.filter((conversation) => conversation.serviceState === "open").length,
    [countBase]
  )

  const closedCount = useMemo(
    () => countBase.filter((conversation) => conversation.serviceState === "closed").length,
    [countBase]
  )

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
      if (ts) setSeenAt(conv.id, ts)

      onSelectConversation(conv.id)
    } catch (error) {
      console.error("Erro ao selecionar conversa", error)
    }
  }

  return (
    <div className="relative min-h-0 bg-transparent">
      <div className="sticky top-0 z-10 border-b border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(247,252,251,0.72))] p-4 backdrop-blur-xl">
        <div className="mb-3">
          <div className="text-[22px] font-semibold tracking-[-0.03em] text-slate-950">WhatsApp Baleys</div>
          <div className="mt-1 text-xs text-slate-500">Conversas ativas com identidade mint</div>
        </div>
        <div className="flex items-center gap-2">
          <input
            placeholder="Buscar por nome, telefone ou mensagem..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 w-full rounded-2xl border border-white/70 bg-white/70 px-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-cyan-200 focus:bg-white focus:shadow-[0_8px_24px_rgba(34,211,238,0.12)]"
          />
          <button
            onClick={() => setShowModal(true)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-[linear-gradient(135deg,rgba(16,185,129,0.94),rgba(34,211,238,0.92))] text-white shadow-[0_14px_28px_rgba(45,212,191,0.28)] transition hover:scale-[1.02]"
            title="Nova conversa"
          >
            +
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2">
          <button
            type="button"
            onClick={() => setServiceFilter("open")}
            className={[
              "flex h-10 items-center justify-center gap-1.5 rounded-2xl border text-sm transition",
              serviceFilter === "open"
                ? "border-emerald-200 bg-[linear-gradient(135deg,rgba(236,253,245,0.96),rgba(236,254,255,0.86))] text-emerald-700 shadow-[0_10px_24px_rgba(16,185,129,0.12)]"
                : "border-white/70 bg-white/68 text-slate-600 hover:bg-white/82"
            ].join(" ")}
            title="Em atendimento"
          >
            <Headset size={16} />
            <span className="text-xs font-medium">{openCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setServiceFilter("closed")}
            className={[
              "flex h-10 items-center justify-center gap-1.5 rounded-2xl border text-sm transition",
              serviceFilter === "closed"
                ? "border-cyan-200 bg-[linear-gradient(135deg,rgba(239,246,255,0.98),rgba(236,254,255,0.88))] text-cyan-700 shadow-[0_10px_24px_rgba(34,211,238,0.12)]"
                : "border-white/70 bg-white/68 text-slate-600 hover:bg-white/82"
            ].join(" ")}
            title="Arquivados/finalizados"
          >
            <Archive size={16} />
            <span className="text-xs font-medium">{closedCount}</span>
          </button>
        </div>
      </div>

      <div className="min-h-0">
        {filteredConversations.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            {serviceFilter === "open"
              ? "Nenhum atendimento em andamento."
              : "Nenhum atendimento arquivado."}
          </div>
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
                  "mx-3 my-2 w-[calc(100%-1.5rem)] rounded-[24px] border px-4 py-3 text-left transition",
                  isSelected
                    ? "border-emerald-200 bg-[linear-gradient(135deg,rgba(236,253,245,0.95),rgba(236,254,255,0.88))] shadow-[0_14px_30px_rgba(16,185,129,0.12)]"
                    : "border-white/70 bg-white/62 hover:bg-white/82 hover:shadow-[0_14px_28px_rgba(148,163,184,0.12)]"
                ].join(" ")}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-[linear-gradient(135deg,rgba(236,253,245,0.96),rgba(224,242,254,0.94))] text-sm font-semibold text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                    {initials}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div
                          className={[
                            "truncate",
                            hasNew ? "font-bold text-slate-950" : "font-semibold text-slate-900"
                          ].join(" ")}
                        >
                          {title}
                        </div>

                        {subtitle ? (
                          <div className="truncate text-xs text-slate-500">{subtitle}</div>
                        ) : null}

                        {conv.agentName ? (
                          <div className="mt-0.5 truncate text-[11px] text-slate-400">
                            Atendente: {conv.agentName}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex items-center gap-2">
                          <div
                            className={[
                              "text-xs",
                              hasNew ? "font-semibold text-slate-800" : "text-slate-400"
                            ].join(" ")}
                          >
                            {time}
                          </div>

                          {hasNew ? (
                            <span
                              className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,0.12)]"
                              title="Nova mensagem"
                            />
                          ) : null}
                        </div>

                        {isLockedByOther ? (
                          <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] text-rose-600">
                            Em atendimento
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div
                      className={[
                        "mt-1 flex items-center gap-1.5 truncate text-sm",
                        hasNew ? "font-semibold text-slate-900" : "text-slate-600"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/24 p-4 backdrop-blur-sm">
          <div className="w-[420px] max-w-[92vw] space-y-4 rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(244,251,250,0.86))] p-6 shadow-[0_32px_90px_rgba(148,163,184,0.18)]">
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">Nova conversa</h2>

            <input
              placeholder="Telefone (5511999999999)"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="w-full rounded-2xl border border-white/70 bg-white/72 px-4 py-3 outline-none transition focus:border-cyan-200 focus:bg-white"
            />

            <textarea
              placeholder="Mensagem inicial..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="min-h-[96px] w-full rounded-2xl border border-white/70 bg-white/72 px-4 py-3 outline-none transition focus:border-cyan-200 focus:bg-white"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-2xl border border-white/70 bg-white/72 px-4 py-2.5 text-slate-700 hover:bg-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateConversation}
                className="rounded-2xl bg-[linear-gradient(135deg,rgba(16,185,129,0.94),rgba(34,211,238,0.92))] px-4 py-2.5 text-white shadow-[0_14px_28px_rgba(45,212,191,0.28)]"
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

type ServiceFilter = "open" | "closed"
