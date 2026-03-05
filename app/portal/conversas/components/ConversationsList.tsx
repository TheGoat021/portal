"use client"

import { useEffect, useMemo, useRef, useState } from "react"

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
  last_message: string
  last_message_at: string
  agent_id?: string | null
  name?: string | null
}

interface Conversation {
  id: string
  phone: string
  name?: string | null
  lastMessage: string
  lastMessageAt?: string
  agentId?: string | null
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

  // ✅ Normaliza role (evita "Diretoria" vs "DIRETORIA" dar bug)
  const roleUpper = (currentUser.role || "").toUpperCase()
  const isDiretoria = roleUpper === "DIRETORIA"

  /**
   * ✅ Guarda a última mensagem "vista" por conversa (timestamp).
   * - Se chegar lastMessageAt maior que lastSeenAt, e a conversa NÃO está aberta, mostramos "nova".
   */
  const [lastSeenAtById, setLastSeenAtById] = useState<Record<string, number>>({})
  const selectedRef = useRef<string | null>(null)

  const fetchConversations = async () => {
    try {
      /**
       * ✅ Importante: seu backend provavelmente exige userId.
       * Então SEMPRE mandamos userId.
       *
       * ✅ Diretoria pede "todas" via scope=all (se o backend ignorar, não quebra).
       * Depois no backend (quando você mandar) a gente faz respeitar.
       */
      const base = `https://apiwhats.drdetodos.com.br/conversations`
      const url = isDiretoria
        ? `${base}?userId=${encodeURIComponent(currentUser.id)}&role=${encodeURIComponent(
            roleUpper
          )}&scope=all`
        : `${base}?userId=${encodeURIComponent(currentUser.id)}&role=${encodeURIComponent(roleUpper)}`

      const res = await fetch(url, { cache: "no-store" })
      if (!res.ok) return

      const data: BackendConversation[] = await res.json()

      const mapped: Conversation[] = data.map((conv) => ({
        id: String(conv.id),
        phone: conv.phone,
        name: conv.name ?? null,
        lastMessage: conv.last_message ?? "",
        lastMessageAt: conv.last_message_at ?? undefined,
        agentId: conv.agent_id ?? null
      }))

      // ✅ Se a conversa estiver aberta, considera "vista" automaticamente
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id, currentUser.role])

  useEffect(() => {
    selectedRef.current = selectedConversationId
  }, [selectedConversationId])

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return conversations

    return conversations.filter((c) => {
      const name = (c.name || "").toLowerCase()
      const phone = (c.phone || "").toLowerCase()
      const last = (c.lastMessage || "").toLowerCase()
      return name.includes(q) || phone.includes(q) || last.includes(q)
    })
  }, [conversations, search])

  const handleCreateConversation = async () => {
    if (!newPhone || !newMessage) return

    try {
      const res = await fetch("https://apiwhats.drdetodos.com.br/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: newPhone,
          message: newMessage,
          userId: currentUser.id
        })
      })

      if (!res.ok) return

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
      // ✅ Diretoria: nunca bloqueia por lock e NÃO tenta dar lock.
      if (!isDiretoria) {
        // regras normais (time comercial)
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
              body: JSON.stringify({ userId: currentUser.id })
            }
          )

          if (!res.ok) {
            alert("Não foi possível assumir a conversa.")
            return
          }
        }
      }

      // ✅ Ao abrir a conversa, marca como "vista" (zera badge)
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

      {/* List */}
      <div className="min-h-0">
        {filteredConversations.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">Nenhuma conversa encontrada.</div>
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = selectedConversationId === conv.id

            // ✅ Diretoria não “sofre” lock
            const isLockedByOther = !isDiretoria && !!conv.agentId && conv.agentId !== currentUser.id

            const title = conv.name?.trim() ? conv.name : conv.phone
            const subtitle = conv.name?.trim() ? conv.phone : ""
            const time = formatListTime(conv.lastMessageAt)
            const initials = getInitials(title)

            // ✅ indicador de "nova mensagem"
            const lastSeenTs = lastSeenAtById[conv.id] ?? 0
            const lastMsgTs = toTs(conv.lastMessageAt)
            const hasNew = !isSelected && lastMsgTs > 0 && lastMsgTs > lastSeenTs

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
                        {subtitle ? <div className="text-xs text-gray-500 truncate">{subtitle}</div> : null}
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

                          {/* 🔴 bolinha de nova mensagem */}
                          {hasNew ? (
                            <span className="w-2.5 h-2.5 rounded-full bg-green-500" title="Nova mensagem" />
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
                        "text-sm truncate mt-1",
                        hasNew ? "text-gray-900 font-semibold" : "text-gray-600"
                      ].join(" ")}
                    >
                      {conv.lastMessage || "—"}
                    </div>
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Modal Nova Conversa */}
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