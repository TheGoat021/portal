"use client"

import { useEffect, useMemo, useState } from "react"

interface Props {
  selectedConversationId: string | null
}

type LeadStatus = "Novo" | "Em contato" | "Proposta" | "Ganho" | "Perdido"

interface Client {
  id: string
  name: string | null
  phone: string
  email?: string | null
  lead_status?: LeadStatus | null
}

export default function ClientDetails({ selectedConversationId }: Props) {
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)

  const statusOptions: LeadStatus[] = useMemo(
    () => ["Novo", "Em contato", "Proposta", "Ganho", "Perdido"],
    []
  )

  const statusBadgeClass = (status?: LeadStatus | null) => {
    switch (status) {
      case "Novo":
        return "bg-gray-100 text-gray-700 border-gray-200"
      case "Em contato":
        return "bg-blue-50 text-blue-700 border-blue-200"
      case "Proposta":
        return "bg-amber-50 text-amber-800 border-amber-200"
      case "Ganho":
        return "bg-green-50 text-green-700 border-green-200"
      case "Perdido":
        return "bg-red-50 text-red-700 border-red-200"
      default:
        return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  useEffect(() => {
    if (!selectedConversationId) {
      setClient(null)
      return
    }

    const fetchClient = async () => {
      try {
        setLoading(true)

        // ✅ como você mudou o backend pra filtrar por role/userId,
        // aqui forçamos role=admin pra trazer todas
        const res = await fetch("https://apiwhats.drdetodos.com.br/conversations?role=admin")

        if (!res.ok) {
          console.error("Erro ao buscar conversas:", await res.text())
          setClient(null)
          return
        }

        const conversations: any[] = await res.json()

        const conversation = conversations.find(
          (c: any) => String(c.id) === String(selectedConversationId)
        )

        if (!conversation) {
          setClient(null)
          return
        }

        // ✅ Se não tiver status ainda no banco, assume "Novo"
        const leadStatus: LeadStatus =
          (conversation.lead_status as LeadStatus) || "Novo"

        setClient({
          id: String(conversation.id),
          name: conversation.name ?? "",
          phone: conversation.phone,
          email: conversation.email ?? "",
          lead_status: leadStatus
        })
      } catch (error) {
        console.error("Erro ao buscar cliente:", error)
        setClient(null)
      } finally {
        setLoading(false)
      }
    }

    fetchClient()
  }, [selectedConversationId])

  const handleSave = async () => {
    if (!client) return

    try {
      setSaving(true)

      const res = await fetch(
        `https://apiwhats.drdetodos.com.br/conversations/${client.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: client.name,
            email: client.email
          })
        }
      )

      if (!res.ok) {
        console.error("Erro ao salvar cliente:", await res.text())
        return
      }
    } catch (error) {
      console.error("Erro ao atualizar cliente:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleChangeStatus = async (nextStatus: LeadStatus) => {
    if (!client) return

    const prev = client.lead_status || "Novo"
    setClient({ ...client, lead_status: nextStatus })

    try {
      setSavingStatus(true)

      // 🔥 IMPORTANTE:
      // precisa existir a coluna `lead_status` na tabela `conversations`.
      // Se ainda não existir, crie no Supabase como text/varchar.
      const res = await fetch(
        `https://apiwhats.drdetodos.com.br/conversations/${client.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lead_status: nextStatus
          })
        }
      )

      if (!res.ok) {
        console.error("Erro ao salvar status:", await res.text())
        setClient({ ...client, lead_status: prev })
        return
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error)
      setClient({ ...client, lead_status: prev })
    } finally {
      setSavingStatus(false)
    }
  }

  const copyPhone = async () => {
    if (!client?.phone) return
    try {
      await navigator.clipboard.writeText(client.phone)
    } catch (e) {
      console.error("Não foi possível copiar:", e)
    }
  }

  if (!selectedConversationId) {
    return (
      <div className="h-full min-h-0 bg-white flex items-center justify-center text-gray-400">
        Nenhum cliente selecionado
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-full min-h-0 bg-white flex items-center justify-center text-gray-400">
        Carregando...
      </div>
    )
  }

  if (!client) {
    return (
      <div className="h-full min-h-0 bg-white flex items-center justify-center text-gray-400">
        Cliente não encontrado
      </div>
    )
  }

  const displayName =
    (client.name && client.name.trim()) || "Sem nome"
  const status = (client.lead_status as LeadStatus) || "Novo"

  return (
    <div className="h-full min-h-0 bg-white flex flex-col">
      {/* Header do painel */}
      <div className="px-6 pt-6 pb-4 border-b">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 border flex items-center justify-center font-semibold text-gray-700">
              {(displayName[0] || "C").toUpperCase()}
            </div>

            <div className="min-w-0">
              <h3 className="text-base font-semibold text-gray-900 truncate">
                {displayName}
              </h3>

              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`text-xs px-2 py-1 rounded-full border ${statusBadgeClass(
                    status
                  )}`}
                >
                  {status}
                </span>

                {savingStatus && (
                  <span className="text-xs text-gray-400">Salvando...</span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={copyPhone}
            className="text-xs px-3 py-2 border rounded-lg hover:bg-gray-50"
            title="Copiar telefone"
          >
            Copiar
          </button>
        </div>

        {/* Status / Etapas */}
        <div className="mt-4">
          <label className="text-xs text-gray-500 block mb-2">
            Status do Lead
          </label>

          <div className="flex flex-wrap gap-2">
            {statusOptions.map((opt) => {
              const active = opt === status
              return (
                <button
                  key={opt}
                  onClick={() => handleChangeStatus(opt)}
                  disabled={savingStatus}
                  className={`text-xs px-3 py-2 rounded-full border transition ${
                    active
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white hover:bg-gray-50"
                  } ${savingStatus ? "opacity-70 cursor-not-allowed" : ""}`}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
        <div className="space-y-5">
          <div>
            <label className="text-sm text-gray-500 block mb-1">Nome</label>
            <input
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-200"
              value={client.name || ""}
              onChange={(e) =>
                setClient({ ...client, name: e.target.value })
              }
              placeholder="Digite o nome do cliente"
            />
          </div>

          <div>
            <label className="text-sm text-gray-500 block mb-1">Telefone</label>
            <div className="flex gap-2">
              <input
                className="w-full border rounded-lg px-3 py-2 bg-gray-50"
                value={client.phone}
                readOnly
              />
              <button
                onClick={copyPhone}
                className="px-3 py-2 border rounded-lg hover:bg-gray-50"
                title="Copiar telefone"
              >
                📋
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-500 block mb-1">Email</label>
            <input
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-200"
              value={client.email || ""}
              onChange={(e) =>
                setClient({ ...client, email: e.target.value })
              }
              placeholder="ex: cliente@empresa.com"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 transition disabled:opacity-70"
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>

          <p className="text-xs text-gray-400">
            Dica: o status padrão deve ser <b>Novo</b> quando a conversa for criada
            pela primeira vez (isso normalmente fica no backend ao criar a conversa).
          </p>
        </div>
      </div>
    </div>
  )
}