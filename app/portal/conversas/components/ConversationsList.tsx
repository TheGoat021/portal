"use client"

import { useEffect, useMemo, useState } from "react"

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

  const fetchConversations = async () => {
    try {
      const res = await fetch(
        `http://167.71.247.30:4000/conversations?userId=${currentUser.id}&role=${currentUser.role}`
      )
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
      const res = await fetch("http://167.71.247.30:4000/send", {
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
      if (conv.agentId && conv.agentId !== currentUser.id) {
        alert("Essa conversa já está sendo atendida por outro usuário.")
        return
      }

      if (!conv.agentId) {
        const res = await fetch(
          `http://167.71.247.30:4000/conversations/${conv.id}/lock`,
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

      onSelectConversation(conv.id)
    } catch (error) {
      console.error("Erro ao selecionar conversa", error)
    }
  }

  return (
    <div className="relative min-h-0">
      {/* Search (agora fica aqui dentro da lista pra não duplicar com o layout, mas é opcional)
          Se você quiser só 1 search, deixa aqui e remove do Layout.
          Como você quer Intercom, eu recomendo 1 search só: vamos manter aqui na lista. */}
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
          <div className="p-6 text-sm text-gray-500">
            Nenhuma conversa encontrada.
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = selectedConversationId === conv.id
            const isLockedByOther = !!conv.agentId && conv.agentId !== currentUser.id

            const title = conv.name?.trim() ? conv.name : conv.phone
            const subtitle = conv.name?.trim() ? conv.phone : ""
            const time = formatListTime(conv.lastMessageAt)
            const initials = getInitials(title)

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
                        <div className="font-semibold text-gray-900 truncate">
                          {title}
                        </div>
                        {subtitle ? (
                          <div className="text-xs text-gray-500 truncate">
                            {subtitle}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="text-xs text-gray-400">{time}</div>
                        {isLockedByOther ? (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
                            Em atendimento
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="text-sm text-gray-600 truncate mt-1">
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
            <h2 className="text-lg font-semibold text-gray-900">
              Nova conversa
            </h2>

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