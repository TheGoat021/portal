"use client"

import { useEffect, useMemo, useState } from "react"

interface Props {
  selectedConversationId: string | null
}

type LeadStatus = "Novo" | "Em contato" | "Proposta" | "Ganho" | "Perdido"
type LeadStatusValue = "novo" | "em_contato" | "proposta" | "ganho" | "perdido"

interface Origem {
  id: string
  nome: string
  plataforma?: string | null
}

interface Client {
  id: string
  leadId: string | null
  name: string | null
  phone: string
  email?: string | null
  lead_status?: LeadStatus | null
  origemId?: string | null
}

const statusToValue: Record<LeadStatus, LeadStatusValue> = {
  Novo: "novo",
  "Em contato": "em_contato",
  Proposta: "proposta",
  Ganho: "ganho",
  Perdido: "perdido"
}

const valueToStatus: Record<LeadStatusValue, LeadStatus> = {
  novo: "Novo",
  em_contato: "Em contato",
  proposta: "Proposta",
  ganho: "Ganho",
  perdido: "Perdido"
}

function normalizeLeadStatus(value: unknown): LeadStatus {
  if (!value || typeof value !== "string") return "Novo"

  if (value in statusToValue) {
    return value as LeadStatus
  }

  const normalized = value.toLowerCase().trim() as LeadStatusValue

  if (normalized in valueToStatus) {
    return valueToStatus[normalized]
  }

  return "Novo"
}

export default function ClientDetails({ selectedConversationId }: Props) {
  const [client, setClient] = useState<Client | null>(null)
  const [origens, setOrigens] = useState<Origem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)
  const [savingOrigem, setSavingOrigem] = useState(false)

  const pipelineSteps: LeadStatus[] = useMemo(
    () => ["Novo", "Em contato", "Proposta", "Ganho"],
    []
  )

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

        const [convRes, leadsRes, origensRes] = await Promise.all([
          fetch("https://apiwhats.drdetodos.com.br/conversations?role=admin"),
          fetch("/api/leads"),
          fetch("/api/origens")
        ])

        if (!convRes.ok) {
          console.error("Erro ao buscar conversas:", await convRes.text())
          setClient(null)
          return
        }

        if (!leadsRes.ok) {
          console.error("Erro ao buscar leads:", await leadsRes.text())
          setClient(null)
          return
        }

        if (!origensRes.ok) {
          console.error("Erro ao buscar origens:", await origensRes.text())
          setOrigens([])
        }

        const conversations: any[] = await convRes.json()
        const leads: any[] = await leadsRes.json()
        const origensData: Origem[] = origensRes.ok ? await origensRes.json() : []

        setOrigens(origensData || [])

        const conversation = conversations.find(
          (c: any) => String(c.id) === String(selectedConversationId)
        )

        if (!conversation) {
          setClient(null)
          return
        }

        const relatedLead = leads.find(
          (lead: any) =>
            String(lead.conversation_id) === String(selectedConversationId)
        )

        const leadStatus = normalizeLeadStatus(relatedLead?.status)

        setClient({
          id: String(conversation.id),
          leadId: relatedLead?.id ? String(relatedLead.id) : null,
          name: conversation.name ?? "",
          phone: conversation.phone ?? "",
          email: conversation.email ?? "",
          lead_status: leadStatus,
          origemId: relatedLead?.origem?.id ? String(relatedLead.origem.id) : null
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
    if (!client?.leadId) {
      console.error("Lead não encontrado para essa conversa")
      return
    }

    if (!statusOptions.includes(nextStatus)) return

    const prev = (client.lead_status as LeadStatus) || "Novo"
    setClient({ ...client, lead_status: nextStatus })

    try {
      setSavingStatus(true)

      const res = await fetch(`/api/leads/${client.leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: statusToValue[nextStatus]
        })
      })

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

  const handleChangeOrigem = async (origemId: string) => {
    if (!client?.leadId) {
      console.error("Lead não encontrado para essa conversa")
      return
    }

    const prev = client.origemId || null
    setClient({ ...client, origemId })

    try {
      setSavingOrigem(true)

      const res = await fetch(`/api/leads/${client.leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origem_id: origemId
        })
      })

      if (!res.ok) {
        console.error("Erro ao salvar origem:", await res.text())
        setClient({ ...client, origemId: prev })
      }
    } catch (error) {
      console.error("Erro ao atualizar origem:", error)
      setClient({ ...client, origemId: prev })
    } finally {
      setSavingOrigem(false)
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

  const displayName = (client.name && client.name.trim()) || "Sem nome"
  const status = (client.lead_status as LeadStatus) || "Novo"
  const currentStepIndex = pipelineSteps.indexOf(status)
  const isLost = status === "Perdido"

  return (
    <div className="h-full min-h-0 bg-white flex flex-col">
      <div className="px-6 pt-6 pb-4 border-b">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-gray-100 border flex items-center justify-center font-semibold text-gray-700 shrink-0">
              {(displayName[0] || "C").toUpperCase()}
            </div>

            <div className="min-w-0">
              <h3 className="text-base font-semibold text-gray-900 truncate">
                {displayName}
              </h3>

              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span
                  className={`text-xs px-2 py-1 rounded-full border ${statusBadgeClass(
                    status
                  )}`}
                >
                  {status}
                </span>

                {savingStatus && (
                  <span className="text-xs text-gray-400">Salvando status...</span>
                )}

                {savingOrigem && (
                  <span className="text-xs text-gray-400">Salvando origem...</span>
                )}

                {!client.leadId && (
                  <span className="text-xs text-amber-600">
                    Lead ainda não sincronizado
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={copyPhone}
            className="text-xs px-3 py-2 border rounded-lg hover:bg-gray-50 shrink-0"
            title="Copiar telefone"
          >
            Copiar
          </button>
        </div>

        <div className="mt-5">
          <label className="text-xs text-gray-500 block mb-3">
            Etapa do Lead
          </label>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {pipelineSteps.map((step, index) => {
              const isActive = status === step
              const isCompleted = !isLost && currentStepIndex > index
              const isUpcoming = !isLost && currentStepIndex < index

              let stepClass =
                "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"

              if (isActive) {
                stepClass = "border-gray-900 bg-gray-900 text-white"
              } else if (isCompleted) {
                stepClass = "border-green-200 bg-green-50 text-green-700"
              } else if (isUpcoming) {
                stepClass = "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
              }

              return (
                <div key={step} className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleChangeStatus(step)}
                    disabled={savingStatus || !client.leadId}
                    className={`px-3 py-2 rounded-full border text-xs font-medium transition whitespace-nowrap ${stepClass} ${
                      savingStatus || !client.leadId
                        ? "opacity-70 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    {isCompleted ? "✓ " : ""}
                    {step}
                  </button>

                  {index < pipelineSteps.length - 1 && (
                    <div
                      className={`w-6 h-px ${
                        !isLost && currentStepIndex > index
                          ? "bg-green-300"
                          : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => handleChangeStatus("Perdido")}
              disabled={savingStatus || !client.leadId}
              className={`text-xs px-3 py-2 rounded-full border transition ${
                status === "Perdido"
                  ? "bg-red-600 text-white border-red-600"
                  : "bg-white text-red-600 border-red-200 hover:bg-red-50"
              } ${
                savingStatus || !client.leadId
                  ? "opacity-70 cursor-not-allowed"
                  : ""
              }`}
            >
              Marcar como perdido
            </button>

            {status === "Perdido" && (
              <button
                onClick={() => handleChangeStatus("Novo")}
                disabled={savingStatus || !client.leadId}
                className={`text-xs px-3 py-2 rounded-full border transition bg-white text-gray-700 border-gray-200 hover:bg-gray-50 ${
                  savingStatus || !client.leadId
                    ? "opacity-70 cursor-not-allowed"
                    : ""
                }`}
              >
                Reabrir lead
              </button>
            )}
          </div>
        </div>
      </div>

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

          <div>
            <label className="text-sm text-gray-500 block mb-1">Origem do lead</label>
            <select
              className="w-full border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-200 disabled:bg-gray-50"
              value={client.origemId || ""}
              onChange={(e) => handleChangeOrigem(e.target.value)}
              disabled={!client.leadId || savingOrigem}
            >
              <option value="">Selecione a origem</option>
              {origens.map((origem) => (
                <option key={origem.id} value={origem.id}>
                  {origem.nome}
                  {origem.plataforma ? ` (${origem.plataforma})` : ""}
                </option>
              ))}
            </select>

            {!client.leadId && (
              <p className="text-xs text-amber-600 mt-2">
                A origem poderá ser alterada assim que o lead for sincronizado.
              </p>
            )}
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
            pela primeira vez.
          </p>
        </div>
      </div>
    </div>
  )
}