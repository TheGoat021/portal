// app/portal/conversas-meta/components/ClientDetails.tsx

"use client"

import { useEffect, useMemo, useState } from "react"
import { Copy } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"

interface Props {
  selectedConversationId: string | null
  currentUser: {
    id: string
    email: string
  }
}

type LeadStatus = "Novo" | "Em contato" | "Proposta" | "Ganho" | "Perdido"
type LeadStatusValue = "novo" | "em_contato" | "proposta" | "ganho" | "perdido"

interface Origem {
  id: string
  nome: string
  plataforma?: string | null
}

interface MetaConversation {
  id: string
  wa_id: string
  contact_name?: string | null
  profile_name?: string | null
  connection_id: string
}

interface Client {
  id: string
  leadId: string | null
  name: string | null
  phone: string
  email?: string | null
  lead_status?: LeadStatus | null
  origemId?: string | null
  connectionId?: string | null
}

type ConversationNote = {
  id: string
  note: string
  user_email?: string | null
  created_at: string
}

type ConversationReminder = {
  scheduled_for: string
  description: string
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

function normalizePhone(phone?: string | null) {
  if (!phone) return ""
  return String(phone).replace(/\D/g, "")
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

function formatDateTimeLocalInput(value?: string | null) {
  if (!value) return ""
  const d = new Date(value)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDateTimeBR(value?: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  })
}

export default function ClientDetails({ selectedConversationId, currentUser }: Props) {
  const [client, setClient] = useState<Client | null>(null)
  const [origens, setOrigens] = useState<Origem[]>([])
  const [notes, setNotes] = useState<ConversationNote[]>([])
  const [newNote, setNewNote] = useState("")
  const [savingNote, setSavingNote] = useState(false)
  const [reminderDateTime, setReminderDateTime] = useState("")
  const [reminderDescription, setReminderDescription] = useState("")
  const [activeReminder, setActiveReminder] = useState<ConversationReminder | null>(null)
  const [savingReminder, setSavingReminder] = useState(false)
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

        const [conversationRes, leadsRes, origensRes, notesRes, reminderRes] = await Promise.all([
          fetch(`/api/whatsapp-meta/conversations/${selectedConversationId}`, { cache: "no-store" }),
          fetch("/api/leads", { cache: "no-store" }),
          fetch("/api/origens", { cache: "no-store" }),
          fetch(`/api/whatsapp-meta/conversations/${selectedConversationId}/notes`, { cache: "no-store" }),
          fetch(`/api/whatsapp-meta/conversations/${selectedConversationId}/reminder`, { cache: "no-store" })
        ])

        if (!conversationRes.ok || !leadsRes.ok) {
          setClient(null)
          return
        }

        const conversationPayload = await conversationRes.json()
        const conversation: MetaConversation | null = conversationPayload?.data ?? conversationPayload ?? null
        const leads: any[] = await leadsRes.json()
        const origensData: Origem[] = origensRes.ok ? await origensRes.json() : []
        const notesPayload = notesRes.ok ? await notesRes.json() : { data: [] }
        const reminderPayload = reminderRes.ok ? await reminderRes.json() : { data: null }

        setOrigens(origensData || [])
        setNotes((notesPayload?.data ?? []) as ConversationNote[])
        setActiveReminder((reminderPayload?.data as ConversationReminder | null) ?? null)
        setReminderDateTime(formatDateTimeLocalInput(reminderPayload?.data?.scheduled_for))
        setReminderDescription(String(reminderPayload?.data?.description || ""))

        if (!conversation) {
          setClient(null)
          return
        }

        const normalizedConversationPhone = normalizePhone(conversation.wa_id)

        const relatedLead = (leads || []).find((lead: any) => {
          const leadConversationId = lead?.conversation_id
          const leadPhone =
            normalizePhone(lead?.phone) ||
            normalizePhone(lead?.telefone) ||
            normalizePhone(lead?.cliente?.telefone)

          return (
            String(leadConversationId || "") === String(selectedConversationId) ||
            (leadPhone && leadPhone === normalizedConversationPhone)
          )
        })

        setClient({
          id: String(conversation.id),
          leadId: relatedLead?.id ? String(relatedLead.id) : null,
          name: conversation.contact_name || conversation.profile_name || "",
          phone: conversation.wa_id ?? "",
          email: relatedLead?.email || relatedLead?.cliente?.email || "",
          lead_status: normalizeLeadStatus(relatedLead?.status),
          origemId: relatedLead?.origem_id
            ? String(relatedLead.origem_id)
            : relatedLead?.origem?.id
              ? String(relatedLead.origem.id)
              : null,
          connectionId: conversation.connection_id || null
        })
      } catch {
        setClient(null)
      } finally {
        setLoading(false)
      }
    }

    fetchClient()
  }, [selectedConversationId])

  const handleAddNote = async () => {
    if (!selectedConversationId || !newNote.trim() || savingNote) return
    try {
      setSavingNote(true)
      const res = await fetch(`/api/whatsapp-meta/conversations/${selectedConversationId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          userEmail: currentUser.email,
          note: newNote.trim()
        })
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok || !payload?.ok) return
      setNotes((prev) => [payload.data as ConversationNote, ...prev])
      setNewNote("")
    } finally {
      setSavingNote(false)
    }
  }

  const handleSaveReminder = async () => {
    if (!selectedConversationId || !reminderDateTime || !reminderDescription.trim() || savingReminder) return
    try {
      setSavingReminder(true)
      const res = await fetch(`/api/whatsapp-meta/conversations/${selectedConversationId}/reminder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          userEmail: currentUser.email,
          scheduledFor: new Date(reminderDateTime).toISOString(),
          description: reminderDescription.trim()
        })
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok || !payload?.ok) return

      const reminder = payload.data as ConversationReminder
      setActiveReminder(reminder)
      setReminderDateTime(formatDateTimeLocalInput(reminder.scheduled_for))
      setReminderDescription(reminder.description)
    } finally {
      setSavingReminder(false)
    }
  }

  const handleCompleteReminder = async () => {
    if (!selectedConversationId || !activeReminder || savingReminder) return
    try {
      setSavingReminder(true)
      await fetch(`/api/whatsapp-meta/conversations/${selectedConversationId}/reminder`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id })
      })
      setActiveReminder(null)
      setReminderDateTime("")
      setReminderDescription("")
    } finally {
      setSavingReminder(false)
    }
  }

  const handleSave = async () => {
    if (!client) return

    try {
      setSaving(true)
      const { error } = await supabase
        .from("meta_conversations")
        .update({ contact_name: client.name || null })
        .eq("id", client.id)

      if (error) {
        console.error("Erro ao salvar cliente meta:", error)
      }
    } catch (error) {
      console.error("Erro ao atualizar cliente meta:", error)
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
    return <div className="h-full bg-white flex items-center justify-center text-gray-400">Nenhum cliente selecionado</div>
  }

  if (loading) {
    return <div className="h-full bg-white flex items-center justify-center text-gray-400">Carregando...</div>
  }

  if (!client) {
    return <div className="h-full bg-white flex items-center justify-center text-gray-400">Cliente nao encontrado</div>
  }

  const displayName = (client.name && client.name.trim()) || "Sem nome"
  const status = (client.lead_status as LeadStatus) || "Novo"
  const currentStepIndex = pipelineSteps.indexOf(status)
  const isLost = status === "Perdido"

  return (
    <div className="h-full min-h-0 bg-[#F9FAFB] flex flex-col">
      <div className="p-4 border-b bg-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-full bg-gray-100 border flex items-center justify-center text-sm font-semibold text-gray-700 shrink-0">
              {(displayName[0] || "C").toUpperCase()}
            </div>

            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 truncate">{displayName}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-[11px] px-2 py-0.5 rounded-full border ${statusBadgeClass(status)}`}>{status}</span>
                {savingStatus && <span className="text-[11px] text-gray-400">Salvando status...</span>}
                {savingOrigem && <span className="text-[11px] text-gray-400">Salvando origem...</span>}
              </div>
            </div>
          </div>

          <button
            onClick={copyPhone}
            className="h-8 w-8 rounded-lg border hover:bg-gray-50 flex items-center justify-center shrink-0"
            title="Copiar telefone"
          >
            <Copy size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        <div className="rounded-xl border bg-white p-3">
          <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">Pipeline</div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {pipelineSteps.map((step, index) => {
              const isActive = status === step
              const isCompleted = !isLost && currentStepIndex > index
              const stepClass = isActive
                ? "border-gray-900 bg-gray-900 text-white"
                : isCompleted
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"

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
                    <div className={`w-4 h-px ${!isLost && currentStepIndex > index ? "bg-green-300" : "bg-gray-200"}`} />
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
                  : "bg-white text-red-600 border-red-200 hover:bg-red-50"
              } ${savingStatus || !client.leadId ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              Marcar perdido
            </button>
            {status === "Perdido" && (
              <button
                onClick={() => handleChangeStatus("Novo")}
                disabled={savingStatus || !client.leadId}
                className={`text-[11px] px-2.5 py-1.5 rounded-full border bg-white text-gray-700 border-gray-200 hover:bg-gray-50 ${
                  savingStatus || !client.leadId ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                Reabrir lead
              </button>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-3 space-y-3">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">Dados do cliente</div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-[11px] text-gray-500 block mb-1">Nome</label>
              <input
                className="w-full h-9 border rounded-lg px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
                value={client.name || ""}
                onChange={(e) => setClient({ ...client, name: e.target.value })}
                placeholder="Nome do cliente"
              />
            </div>

            <div>
              <label className="text-[11px] text-gray-500 block mb-1">Telefone</label>
              <div className="flex gap-2">
                <input className="w-full h-9 border rounded-lg px-2.5 text-sm bg-gray-50" value={client.phone} readOnly />
                <button
                  onClick={copyPhone}
                  className="h-9 w-9 border rounded-lg hover:bg-gray-50 flex items-center justify-center"
                  title="Copiar telefone"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-gray-500 block mb-1">Email</label>
              <input
                className="w-full h-9 border rounded-lg px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
                value={client.email || ""}
                onChange={(e) => setClient({ ...client, email: e.target.value })}
                placeholder="cliente@empresa.com"
              />
            </div>

            <div>
              <label className="text-[11px] text-gray-500 block mb-1">Origem</label>
              <select
                className="w-full h-9 border rounded-lg px-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-200 disabled:bg-gray-50"
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
            <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2">
              Lead ainda nao sincronizado.
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-9 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition disabled:opacity-70"
          >
            {saving ? "Salvando..." : "Salvar alteracoes"}
          </button>
        </div>

        <div className="rounded-xl border bg-white p-3 space-y-3">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">Realizar mais tarde</div>

          {activeReminder ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-xs text-blue-900">
              <div className="font-medium">Agendado para {formatDateTimeBR(activeReminder.scheduled_for)}</div>
              <div className="mt-1 whitespace-pre-wrap">{activeReminder.description}</div>
            </div>
          ) : null}

          <div className="space-y-2">
            <input
              type="datetime-local"
              value={reminderDateTime}
              onChange={(e) => setReminderDateTime(e.target.value)}
              className="w-full h-9 border rounded-lg px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
            />
            <textarea
              value={reminderDescription}
              onChange={(e) => setReminderDescription(e.target.value)}
              className="w-full min-h-[78px] border rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
              placeholder="O que precisa ser feito com esse cliente..."
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSaveReminder}
              disabled={savingReminder || !reminderDateTime || !reminderDescription.trim()}
              className="flex-1 h-9 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition disabled:opacity-70"
            >
              {savingReminder ? "Salvando..." : "Salvar agendamento"}
            </button>
            {activeReminder ? (
              <button
                onClick={handleCompleteReminder}
                disabled={savingReminder}
                className="h-9 px-3 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-70"
              >
                Concluir
              </button>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-3 space-y-3">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">Notas</div>

          <div className="space-y-2">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="w-full min-h-[80px] border rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
              placeholder="Anote informacoes importantes sobre esse cliente..."
            />
            <button
              onClick={handleAddNote}
              disabled={savingNote || !newNote.trim()}
              className="h-9 px-3 rounded-lg bg-gray-900 text-white text-sm hover:bg-black transition disabled:opacity-70"
            >
              {savingNote ? "Salvando..." : "Adicionar nota"}
            </button>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {notes.length === 0 ? (
              <div className="text-xs text-gray-500">Nenhuma nota ainda.</div>
            ) : (
              notes.map((note) => (
                <div key={note.id} className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2">
                  <div className="text-[11px] text-gray-500">
                    {(note.user_email || "Operador")} • {formatDateTimeBR(note.created_at)}
                  </div>
                  <div className="text-sm text-gray-800 whitespace-pre-wrap mt-1">{note.note}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
