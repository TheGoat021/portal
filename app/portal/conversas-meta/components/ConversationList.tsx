// app/portal/conversas-meta/components/ConversationsList.tsx

"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Archive,
  Bell,
  BellOff,
  Bot,
  FileText,
  Headset,
  Image as ImageIcon,
  Mic,
  MessageSquare,
  UserCheck,
  UserX,
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
  service_state?: "bot" | "operator" | "closed"
  assigned_user_id?: string | null
  waiting_for_reply?: boolean
  minutes_without_reply?: number | null
  response_alert_level?: "warning" | "danger" | null
  reminder_due_at?: string | null
  reminder_description?: string | null
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
  serviceState: "bot" | "operator" | "closed"
  assignedUserId?: string | null
  waitingForReply?: boolean
  minutesWithoutReply?: number | null
  responseAlertLevel?: "warning" | "danger" | null
  reminderDueAt?: string | null
  reminderDescription?: string | null
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
        text: text && text !== "ðŸ“· Imagem" ? text : "Imagem"
      }

    case "video":
      return {
        icon: <Video size={14} className="opacity-70 shrink-0" />,
        text: text && text !== "ðŸŽ¥ VÃ­deo" ? text : "VÃ­deo"
      }

    case "audio":
    case "ptt":
      return {
        icon: <Mic size={14} className="opacity-70 shrink-0" />,
        text: "Ãudio"
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
        text: "LocalizaÃ§Ã£o"
      }

    default:
      return {
        icon: null,
        text: text || "â€”"
      }
  }
}

export default function ConversationsList({
  selectedConversationId,
  onSelectConversation,
  currentUser
}: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [connections, setConnections] = useState<MetaConnection[]>([])
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>("")
  const [showModal, setShowModal] = useState(false)
  const [newPhone, setNewPhone] = useState("")
  const [newMessage, setNewMessage] = useState("")
  const [search, setSearch] = useState("")
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>("bot")
  const [loadingConnections, setLoadingConnections] = useState(false)
  const [creatingConversation, setCreatingConversation] = useState(false)
  const [pullingConversationId, setPullingConversationId] = useState<string | null>(null)
  const [onlyUnreadForOperator, setOnlyUnreadForOperator] = useState(false)
  const [distributionActive, setDistributionActive] = useState(true)
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [savingAvailability, setSavingAvailability] = useState(false)
  const roleUpper = (currentUser.role || "").toUpperCase()
  const isDiretoria =
    roleUpper === "DIRETORIA" ||
    roleUpper === "ADMINISTRAÃ‡ÃƒO" ||
    roleUpper === "ADMINISTRACAO" ||
    roleUpper === "ADMIN"


  const fetchConnections = async () => {
    try {
      setLoadingConnections(true)

      const res = await fetch("/api/meta/embedded-signup/connections", {
        cache: "no-store"
      })

      if (!res.ok) {
        console.error("Erro ao buscar conexÃµes Meta:", await res.text())
        return
      }

      const payload = await res.json()
      const items: MetaConnection[] = payload?.data ?? []

      setConnections(items)

      if (!selectedConnectionId && items.length > 0) {
        setSelectedConnectionId(items[0].id)
      }
    } catch (error) {
      console.error("Erro ao buscar conexÃµes Meta:", error)
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
        `/api/whatsapp-meta/conversations?connectionId=${encodeURIComponent(activeConnectionId)}&userId=${encodeURIComponent(currentUser.id)}&userRole=${encodeURIComponent(currentUser.role || "")}`,
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
        serviceState: conv.service_state || "bot",
        assignedUserId: conv.assigned_user_id ?? null,
        waitingForReply: Boolean(conv.waiting_for_reply),
        minutesWithoutReply:
          typeof conv.minutes_without_reply === "number" ? Number(conv.minutes_without_reply) : null,
        responseAlertLevel: conv.response_alert_level ?? null,
        reminderDueAt: conv.reminder_due_at ?? null,
        reminderDescription: conv.reminder_description ?? null,
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

  useEffect(() => {
    if (!selectedConnectionId || isDiretoria) {
      setDistributionActive(true)
      return
    }

    let active = true
    setLoadingAvailability(true)

    fetch(
      `/api/whatsapp-meta/agent-availability?connectionId=${encodeURIComponent(selectedConnectionId)}&userId=${encodeURIComponent(currentUser.id)}`,
      { cache: "no-store" }
    )
      .then(async (res) => {
        const payload = await res.json().catch(() => null)
        if (!active) return
        if (!res.ok || !payload?.ok) return
        setDistributionActive(Boolean(payload.data?.isActive))
      })
      .catch((error) => {
        console.error("Erro ao carregar disponibilidade do operador:", error)
      })
      .finally(() => {
        if (active) setLoadingAvailability(false)
      })

    return () => {
      active = false
    }
  }, [selectedConnectionId, currentUser.id, isDiretoria])

  const toggleDistributionActive = async () => {
    if (!selectedConnectionId || isDiretoria || savingAvailability) return

    const nextValue = !distributionActive
    setDistributionActive(nextValue)
    setSavingAvailability(true)

    try {
      const res = await fetch("/api/whatsapp-meta/agent-availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionId: selectedConnectionId,
          userId: currentUser.id,
          userRole: currentUser.role || "",
          isActive: nextValue
        })
      })

      const payload = await res.json().catch(() => null)
      if (!res.ok || !payload?.ok) {
        setDistributionActive(!nextValue)
        console.error("Erro ao atualizar disponibilidade do operador:", payload?.error || "falha")
      }
    } catch (error) {
      setDistributionActive(!nextValue)
      console.error("Erro ao atualizar disponibilidade do operador:", error)
    } finally {
      setSavingAvailability(false)
    }
  }

  const visibleConversations = useMemo(() => {
    if (isDiretoria) return conversations

    return conversations.filter((conversation) => {
      if (conversation.serviceState === "bot") return true
      return conversation.assignedUserId === currentUser.id
    })
  }, [conversations, currentUser.id, isDiretoria])

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase()
    let base = visibleConversations.filter((conversation) => conversation.serviceState === serviceFilter)

    if (!isDiretoria && onlyUnreadForOperator) {
      base = base.filter((conversation) => (conversation.unreadCount ?? 0) > 0)
    }

    const filtered = !q
      ? base
      : base.filter((c) => {
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

    const nowMs = Date.now()
    return [...filtered].sort((a, b) => {
      const aReminderMs = a.reminderDueAt ? new Date(a.reminderDueAt).getTime() : Number.POSITIVE_INFINITY
      const bReminderMs = b.reminderDueAt ? new Date(b.reminderDueAt).getTime() : Number.POSITIVE_INFINITY

      const aReminderDue = a.serviceState === "operator" && Number.isFinite(aReminderMs) && aReminderMs <= nowMs
      const bReminderDue = b.serviceState === "operator" && Number.isFinite(bReminderMs) && bReminderMs <= nowMs

      if (aReminderDue !== bReminderDue) {
        return aReminderDue ? -1 : 1
      }

      if (aReminderDue && bReminderDue && aReminderMs !== bReminderMs) {
        return aReminderMs - bReminderMs
      }

      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
      return bTime - aTime
    })
  }, [visibleConversations, search, serviceFilter, isDiretoria, onlyUnreadForOperator])

  const unreadVisibleCount = useMemo(
    () => visibleConversations.filter((conversation) => (conversation.unreadCount ?? 0) > 0).length,
    [visibleConversations]
  )

  const botCount = useMemo(
    () => visibleConversations.filter((conversation) => conversation.serviceState === "bot").length,
    [visibleConversations]
  )

  const operatorCount = useMemo(
    () => visibleConversations.filter((conversation) => conversation.serviceState === "operator").length,
    [visibleConversations]
  )

  const closedCount = useMemo(
    () => visibleConversations.filter((conversation) => conversation.serviceState === "closed").length,
    [visibleConversations]
  )

  const handleCreateConversation = async () => {
    if (!selectedConnectionId || !newPhone.trim() || !newMessage.trim() || creatingConversation) {
      return
    }

    try {
      setCreatingConversation(true)

      const normalizedPhone = normalizePhone(newPhone)

      const connection = connections.find((item) => item.id === selectedConnectionId)
      if (!connection) {
        console.error("ConexÃ£o Meta nÃ£o encontrada")
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
        console.error("ConversationId nÃ£o retornado")
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

  const handlePullToOperator = async (conv: Conversation) => {
    if (!conv?.id || !currentUser?.id || pullingConversationId) return

    try {
      setPullingConversationId(conv.id)

      const res = await fetch(`/api/whatsapp-meta/conversations/${conv.id}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toUserId: currentUser.id,
          byUserId: currentUser.id
        })
      })

      if (!res.ok) {
        console.error("Erro ao puxar conversa para atendimento:", await res.text())
        return
      }

      setServiceFilter("operator")
      await fetchConversations(selectedConnectionId)
      onSelectConversation(conv.id)
    } catch (error) {
      console.error("Erro ao puxar conversa para atendimento:", error)
    } finally {
      setPullingConversationId(null)
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
              {loadingConnections ? "Carregando conexÃµes..." : "Selecione uma conexÃ£o Meta"}
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

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setServiceFilter("bot")}
            className={[
              "h-10 rounded-xl border flex items-center justify-center gap-1.5 transition",
              serviceFilter === "bot"
                ? "bg-blue-50 border-blue-300 text-blue-700"
                : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
            ].join(" ")}
            title="Clientes no fluxo do bot"
          >
            <Bot size={16} />
            <span className="text-xs font-medium">{botCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setServiceFilter("operator")}
            className={[
              "h-10 rounded-xl border flex items-center justify-center gap-1.5 transition",
              serviceFilter === "operator"
                ? "bg-green-50 border-green-300 text-green-700"
                : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
            ].join(" ")}
            title="Clientes em atendimento com operador"
          >
            <Headset size={16} />
            <span className="text-xs font-medium">{operatorCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setServiceFilter("closed")}
            className={[
              "h-10 rounded-xl border flex items-center justify-center gap-1.5 transition",
              serviceFilter === "closed"
                ? "bg-amber-50 border-amber-300 text-amber-700"
                : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
            ].join(" ")}
            title="Atendimentos encerrados"
          >
            <Archive size={16} />
            <span className="text-xs font-medium">{closedCount}</span>
          </button>
        </div>

        {selectedConnection ? (
          <div className="px-1 flex items-center justify-between gap-2">
            <div className="text-[11px] text-gray-500">
              Conexão ativa:{" "}
              <span className="font-medium text-gray-700">
                {selectedConnection.display_phone_number ||
                  selectedConnection.verified_name ||
                  selectedConnection.id}
              </span>
            </div>

            {!isDiretoria ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleDistributionActive}
                  disabled={loadingAvailability || savingAvailability}
                  className={[
                    "h-7 px-2 rounded-full border text-[11px] font-medium flex items-center gap-1.5 transition disabled:opacity-60",
                    distributionActive
                      ? "bg-green-50 text-green-700 border-green-300"
                      : "bg-red-50 text-red-700 border-red-300"
                  ].join(" ")}
                  title="Disponibilidade do operador para distribuicao automatica"
                >
                  {distributionActive ? <UserCheck size={12} /> : <UserX size={12} />}
                  <span>{distributionActive ? "Ativo na fila" : "Pausado na fila"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOnlyUnreadForOperator((prev) => !prev)}
                  className={[
                    "h-7 px-2 rounded-full border text-[11px] font-medium flex items-center gap-1.5 transition",
                    onlyUnreadForOperator
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                  ].join(" ")}
                  title="Mostrar apenas conversas com mensagens não lidas"
                >
                  {onlyUnreadForOperator ? <Bell size={12} /> : <BellOff size={12} />}
                  <span>Não lidas</span>
                  <span className="text-[10px] opacity-80">({unreadVisibleCount})</span>
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="min-h-0">
        {!selectedConnectionId ? (
          <div className="p-6 text-sm text-gray-500">
            Selecione uma conexÃ£o Meta para ver as conversas.
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">
            {serviceFilter === "bot"
              ? "Nenhum cliente no fluxo do bot."
              : serviceFilter === "operator"
                ? "Nenhum cliente em atendimento com operador."
                : "Nenhum atendimento encerrado."}
          </div>
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
            const reminderMs = conv.reminderDueAt ? new Date(conv.reminderDueAt).getTime() : null
            const reminderDue = conv.serviceState === "operator" && reminderMs !== null && reminderMs <= Date.now()

            return (
              <div
                key={conv.id}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectConversation(conv)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    handleSelectConversation(conv)
                  }
                }}
                className={[
                  "w-full text-left px-4 py-3 border-b transition cursor-pointer",
                  conv.responseAlertLevel === "danger"
                    ? "border-red-500 bg-red-100/95 shadow-[inset_0_0_0_1px_rgba(220,38,38,0.45)] hover:bg-red-200/95"
                    : conv.responseAlertLevel === "warning"
                      ? "border-amber-400 bg-amber-100/95 shadow-[inset_0_0_0_1px_rgba(217,119,6,0.45)] hover:bg-amber-200/95"
                      : "border-gray-100 hover:bg-gray-50",
                  isSelected ? "ring-1 ring-gray-300" : ""
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
                              {conv.unreadCount > 9 ? "9+" : conv.unreadCount || "â€¢"}
                            </span>
                          ) : null}
                        </div>

                        {serviceFilter === "bot" && conv.serviceState === "bot" ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              handlePullToOperator(conv)
                            }}
                            className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:opacity-60"
                            disabled={pullingConversationId === conv.id}
                          >
                            {pullingConversationId === conv.id ? "Puxando..." : "Puxar"}
                          </button>
                        ) : null}
                        {conv.reminderDueAt ? (
                          <div
                            className={[
                              "text-[10px] px-1.5 py-0.5 rounded-full border flex items-center gap-1",
                              reminderDue
                                ? "bg-red-100 text-red-800 border-red-300"
                                : "bg-indigo-50 text-indigo-700 border-indigo-200"
                            ].join(" ")}
                            title={conv.reminderDescription || "Realizar mais tarde"}
                          >
                            <Bell size={10} />
                            <span>{formatReminderSmall(conv.reminderDueAt)}</span>
                          </div>
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
              </div>
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

function formatReminderSmall(dateString?: string | null) {
  if (!dateString) return ""
  const d = new Date(dateString)
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  })
}

type ServiceFilter = "bot" | "operator" | "closed"

