"use client"

import { useEffect, useMemo, useState } from "react"
import { Copy } from "lucide-react"

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

type ConversationRecord = {
  id?: string | number | null
  name?: string | null
  phone?: string | null
  email?: string | null
}

type LeadRecord = {
  id?: string | number | null
  conversation_id?: string | number | null
  status?: string | null
  origem?: {
    id?: string | number | null
  } | null
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
  if (value in statusToValue) return value as LeadStatus

  const normalized = value.toLowerCase().trim() as LeadStatusValue
  if (normalized in valueToStatus) return valueToStatus[normalized]
  return "Novo"
}

export default function ClientDetails({ selectedConversationId }: Props) {
  const [client, setClient] = useState<Client | null>(null)
  const [origens, setOrigens] = useState<Origem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)
  const [savingOrigem, setSavingOrigem] = useState(false)

  const pipelineSteps: LeadStatus[] = useMemo(() => ["Novo", "Em contato", "Proposta", "Ganho"], [])
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

        if (!convRes.ok || !leadsRes.ok) {
          setClient(null)
          return
        }

        const conversations: ConversationRecord[] = await convRes.json()
        const leads: LeadRecord[] = await leadsRes.json()
        const origensData: Origem[] = origensRes.ok ? await origensRes.json() : []

        setOrigens(origensData || [])

        const conversation = conversations.find((c) => String(c.id) === String(selectedConversationId))
        if (!conversation) {
          setClient(null)
          return
        }

        const relatedLead = leads.find((lead) => String(lead.conversation_id) === String(selectedConversationId))

        setClient({
          id: String(conversation.id),
          leadId: relatedLead?.id ? String(relatedLead.id) : null,
          name: conversation.name ?? "",
          phone: conversation.phone ?? "",
          email: conversation.email ?? "",
          lead_status: normalizeLeadStatus(relatedLead?.status),
          origemId: relatedLead?.origem?.id ? String(relatedLead.origem.id) : null
        })
      } catch {
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
      const res = await fetch(`https://apiwhats.drdetodos.com.br/conversations/${client.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: client.name,
          email: client.email
        })
      })
      if (!res.ok) {
        console.error("Erro ao salvar cliente:", await res.text())
      }
    } catch (error) {
      console.error("Erro ao atualizar cliente:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleChangeStatus = async (nextStatus: LeadStatus) => {
    if (!client?.leadId || !statusOptions.includes(nextStatus)) return

    const prev = (client.lead_status as LeadStatus) || "Novo"
    setClient({ ...client, lead_status: nextStatus })

    try {
      setSavingStatus(true)
      const res = await fetch(`/api/leads/${client.leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusToValue[nextStatus] })
      })

      if (!res.ok) {
        setClient({ ...client, lead_status: prev })
      }
    } catch {
      setClient({ ...client, lead_status: prev })
    } finally {
      setSavingStatus(false)
    }
  }

  const handleChangeOrigem = async (origemId: string) => {
    if (!client?.leadId) return

    const prev = client.origemId || null
    setClient({ ...client, origemId })

    try {
      setSavingOrigem(true)
      const res = await fetch(`/api/leads/${client.leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origem_id: origemId })
      })

      if (!res.ok) {
        setClient({ ...client, origemId: prev })
      }
    } catch {
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
      console.error("Nao foi possivel copiar:", e)
    }
  }

  if (!selectedConversationId) {
    return <div className="flex h-full items-center justify-center bg-transparent text-slate-400">Nenhum cliente selecionado</div>
  }

  if (loading) {
    return <div className="flex h-full items-center justify-center bg-transparent text-slate-400">Carregando...</div>
  }

  if (!client) {
    return <div className="flex h-full items-center justify-center bg-transparent text-slate-400">Cliente nao encontrado</div>
  }

  const displayName = (client.name && client.name.trim()) || "Sem nome"
  const status = (client.lead_status as LeadStatus) || "Novo"
  const currentStepIndex = pipelineSteps.indexOf(status)
  const isLost = status === "Perdido"

  return (
    <div className="flex h-full min-h-0 flex-col bg-transparent">
      <div className="border-b border-white/60 bg-white/36 p-4 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-[linear-gradient(135deg,rgba(236,253,245,0.96),rgba(224,242,254,0.94))] text-sm font-semibold text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
              {(displayName[0] || "C").toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-slate-900">{displayName}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-[11px] px-2 py-0.5 rounded-full border ${statusBadgeClass(status)}`}>{status}</span>
                {savingStatus && <span className="text-[11px] text-slate-400">Salvando status...</span>}
                {savingOrigem && <span className="text-[11px] text-slate-400">Salvando origem...</span>}
              </div>
            </div>
          </div>

          <button
            onClick={copyPhone}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/70 text-slate-600 shadow-[0_8px_24px_rgba(148,163,184,0.12)] hover:bg-white"
            title="Copiar telefone"
          >
            <Copy size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 space-y-3 overflow-y-auto p-4">
        <div className="rounded-[24px] border border-white/70 bg-white/62 p-4 shadow-[0_14px_28px_rgba(148,163,184,0.1)] backdrop-blur-xl">
          <div className="mb-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">Pipeline</div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {pipelineSteps.map((step, index) => {
              const isActive = status === step
              const isCompleted = !isLost && currentStepIndex > index
                  const stepClass = isActive
                ? "border-emerald-400 bg-[linear-gradient(135deg,rgba(16,185,129,0.92),rgba(34,211,238,0.88))] text-white shadow-[0_10px_24px_rgba(45,212,191,0.22)]"
                : isCompleted
                  ? "border-emerald-200 bg-[linear-gradient(135deg,rgba(236,253,245,0.96),rgba(236,254,255,0.88))] text-emerald-700"
                  : "border-white/70 bg-white/76 text-slate-600 hover:bg-white"

              return (
                <div key={step} className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleChangeStatus(step)}
                    disabled={savingStatus || !client.leadId}
                    className={`px-2.5 py-1.5 rounded-full border text-[11px] font-medium whitespace-nowrap ${stepClass} ${
                      savingStatus || !client.leadId ? "opacity-70 cursor-not-allowed" : ""
                    }`}
                  >
                    {isCompleted ? "OK " : ""}
                    {step}
                  </button>
                  {index < pipelineSteps.length - 1 && (
                    <div className={`h-px w-4 ${!isLost && currentStepIndex > index ? "bg-emerald-300" : "bg-slate-200"}`} />
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={() => handleChangeStatus("Perdido")}
              disabled={savingStatus || !client.leadId}
              className={`text-[11px] px-2.5 py-1.5 rounded-full border ${
                status === "Perdido"
                  ? "bg-red-600 text-white border-red-600"
                  : "bg-white/78 text-red-600 border-red-200 hover:bg-red-50"
              } ${savingStatus || !client.leadId ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              Marcar como perdido
            </button>

            {status === "Perdido" && (
              <button
                onClick={() => handleChangeStatus("Novo")}
                disabled={savingStatus || !client.leadId}
                className={`text-[11px] px-2.5 py-1.5 rounded-full border bg-white/78 text-slate-700 border-white/70 hover:bg-white ${
                  savingStatus || !client.leadId ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                Reabrir lead
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3 rounded-[24px] border border-white/70 bg-white/62 p-4 shadow-[0_14px_28px_rgba(148,163,184,0.1)] backdrop-blur-xl">
          <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Dados do cliente</div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="mb-1 block text-[11px] text-slate-500">Nome</label>
              <input
                className="h-10 w-full rounded-2xl border border-white/70 bg-white/78 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-100"
                value={client.name || ""}
                onChange={(e) => setClient({ ...client, name: e.target.value })}
                placeholder="Nome do cliente"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] text-slate-500">Telefone</label>
              <div className="flex gap-2">
                <input className="h-10 w-full rounded-2xl border border-white/70 bg-white/72 px-3 text-sm text-slate-700" value={client.phone} readOnly />
                <button
                  onClick={copyPhone}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/70 bg-white/72 text-slate-600 hover:bg-white"
                  title="Copiar telefone"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] text-slate-500">Email</label>
              <input
                className="h-10 w-full rounded-2xl border border-white/70 bg-white/78 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-100"
                value={client.email || ""}
                onChange={(e) => setClient({ ...client, email: e.target.value })}
                placeholder="cliente@empresa.com"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] text-slate-500">Origem do lead</label>
              <select
                className="h-10 w-full rounded-2xl border border-white/70 bg-white/78 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-100 disabled:bg-white/60"
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
            </div>
          </div>

          {!client.leadId && (
            <p className="rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] text-amber-600">
              Lead ainda nao sincronizado.
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="h-10 w-full rounded-2xl bg-[linear-gradient(135deg,rgba(16,185,129,0.94),rgba(34,211,238,0.92))] text-sm text-white shadow-[0_14px_28px_rgba(45,212,191,0.24)] transition hover:scale-[1.01] disabled:opacity-70"
          >
            {saving ? "Salvando..." : "Salvar alteracoes"}
          </button>
        </div>
      </div>
    </div>
  )
}
