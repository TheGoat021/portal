'use client'

import { useEffect, useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { updateLeadStatus } from '@/services/leads'
import LeadCard from './LeadCard'
import { Lead } from '@/types/lead'
import NovoLeadModal from './NovoLeadModal'

const PAGE_SIZE = 50

const colunas = [
  { key: 'novo', label: 'Novo' },
  { key: 'em_contato', label: 'Em contato' },
  { key: 'proposta', label: 'Proposta' },
  { key: 'ganho', label: 'Ganho' },
  { key: 'perdido', label: 'Perdido' }
] as const

type LeadStatus = (typeof colunas)[number]['key']

function normalizePhone(phone?: string | null) {
  if (!phone) return ''
  return String(phone).replace(/\D/g, '')
}

type LeadWithAgent = Lead & {
  conversation_agent_name?: string | null
}

type StageState = {
  items: LeadWithAgent[]
  offset: number
  total: number
  hasMore: boolean
  loading: boolean
}

function initialStages(): Record<LeadStatus, StageState> {
  return {
    novo: { items: [], offset: 0, total: 0, hasMore: false, loading: false },
    em_contato: { items: [], offset: 0, total: 0, hasMore: false, loading: false },
    proposta: { items: [], offset: 0, total: 0, hasMore: false, loading: false },
    ganho: { items: [], offset: 0, total: 0, hasMore: false, loading: false },
    perdido: { items: [], offset: 0, total: 0, hasMore: false, loading: false }
  }
}

export default function LeadsPage() {
  const [stages, setStages] = useState<Record<LeadStatus, StageState>>(initialStages())
  const [showNovoLead, setShowNovoLead] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState('all')

  useEffect(() => {
    loadAllStages(true).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function syncWhatsAppLeads() {
    try {
      await fetch('/api/leads/sync-whatsapp', {
        method: 'POST'
      })
    } catch (error) {
      console.error('Erro ao sincronizar leads do WhatsApp:', error)
    }
  }

  async function enrichLeadsWithAssignedAgent(data: Lead[]) {
    const uniquePhones = Array.from(
      new Set(
        data
          .map((lead) => normalizePhone(lead.cliente?.telefone))
          .filter(Boolean)
      )
    )

    if (uniquePhones.length === 0) {
      return data.map((lead) => ({ ...lead, conversation_agent_name: null }))
    }

    try {
      const query = encodeURIComponent(uniquePhones.join(','))
      const res = await fetch(`/api/whatsapp/assigned-agent-by-phone?phones=${query}`, {
        cache: 'no-store'
      })

      if (!res.ok) {
        return data.map((lead) => ({ ...lead, conversation_agent_name: null }))
      }

      const json = await res.json()
      const agentsMap = (json?.agents ?? {}) as Record<string, string | null>

      return data.map((lead) => {
        const phone = normalizePhone(lead.cliente?.telefone)
        return {
          ...lead,
          conversation_agent_name: phone ? agentsMap[phone] || null : null
        }
      })
    } catch {
      return data.map((lead) => ({ ...lead, conversation_agent_name: null }))
    }
  }

  async function loadStage(status: LeadStatus, reset = false) {
    const current = stages[status]
    const nextOffset = reset ? 0 : current.offset

    setStages((prev) => ({
      ...prev,
      [status]: {
        ...prev[status],
        loading: true
      }
    }))

    try {
      const params = new URLSearchParams({
        status,
        limit: String(PAGE_SIZE),
        offset: String(nextOffset)
      })

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      const res = await fetch(`/api/leads?${params.toString()}`, {
        cache: 'no-store',
        signal: controller.signal
      }).finally(() => clearTimeout(timeout))
      if (!res.ok) throw new Error('Erro ao carregar leads da etapa')

      const payload = await res.json()
      const rows: Lead[] = Array.isArray(payload?.data) ? payload.data : []
      const pagination = payload?.pagination ?? {}
      const enriched = await enrichLeadsWithAssignedAgent(rows)

      setStages((prev) => {
        const prevItems = reset ? [] : prev[status].items
        const seenIds = new Set(prevItems.map((item) => item.id))
        const merged = [...prevItems, ...enriched.filter((item) => !seenIds.has(item.id))]

        return {
          ...prev,
          [status]: {
            items: merged,
            offset: nextOffset + rows.length,
            total: Number(pagination?.total ?? merged.length),
            hasMore: Boolean(pagination?.hasMore),
            loading: false
          }
        }
      })
    } catch (error) {
      console.error(`Erro ao carregar etapa ${status}:`, error)
      setStages((prev) => ({
        ...prev,
        [status]: {
          ...prev[status],
          loading: false
        }
      }))
    }
  }

  async function loadAllStages(reset = false) {
    try {
      // O sync pode levar bastante tempo em bases grandes.
      // Rodamos em paralelo sem bloquear a renderização da pipeline.
      syncWhatsAppLeads().catch((error) => {
        console.error('Erro no sync em background:', error)
      })

      await Promise.allSettled(colunas.map((coluna) => loadStage(coluna.key, reset)))
    } catch (error) {
      console.error('Erro ao carregar pipeline:', error)
      setStages(initialStages())
    }
  }

  async function moverLead(id: string, status: Lead['status']) {
    try {
      await updateLeadStatus(id, status)
      await loadAllStages(true)
    } catch (error) {
      console.error('Erro ao mover lead:', error)
    }
  }

  const allLoadedLeads = useMemo(
    () => colunas.flatMap((coluna) => stages[coluna.key].items),
    [stages]
  )

  const agentes = useMemo(() => {
    return Array.from(
      new Set(
        allLoadedLeads
          .map((lead) => lead.conversation_agent_name?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [allLoadedLeads])

  return (
    <div className="h-full bg-[#f8fafc] p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Pipeline de Leads
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Acompanhe a evolução dos leads por etapa
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
            <Users size={16} className="text-gray-500" />

            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="bg-transparent text-sm text-gray-700 outline-none"
            >
              <option value="all">Todos os colaboradores</option>
              {agentes.map((agente) => (
                <option key={agente} value={agente}>
                  {agente}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowNovoLead(true)}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            + Novo Lead
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-[calc(100vh-180px)] items-center justify-center rounded-2xl border border-gray-200 bg-white text-sm text-gray-500">
          Carregando pipeline...
        </div>
      ) : (
        <div className="grid h-[calc(100vh-180px)] grid-cols-5 gap-4">
          {colunas.map((coluna) => {
            const stage = stages[coluna.key]
            const leadsDaColuna =
              selectedAgent === 'all'
                ? stage.items
                : stage.items.filter(
                    (lead) => (lead.conversation_agent_name || '') === selectedAgent
                  )

            const badgeCount =
              selectedAgent === 'all'
                ? stage.total
                : leadsDaColuna.length

            return (
              <div
                key={coluna.key}
                className="flex min-h-0 flex-col rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
                  <h2 className="text-sm font-semibold text-gray-800">
                    {coluna.label}
                  </h2>

                  <span className="flex h-7 min-w-7 items-center justify-center rounded-full border border-gray-200 bg-gray-50 px-2 text-xs font-medium text-gray-600">
                    {badgeCount}
                  </span>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto p-3">
                  {leadsDaColuna.length > 0 ? (
                    leadsDaColuna.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        onMove={moverLead}
                        onUpdated={() => loadAllStages(true)}
                      />
                    ))
                  ) : (
                    <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-gray-200 text-sm text-gray-400">
                      Nenhum lead
                    </div>
                  )}

                  {stage.hasMore && (
                    <button
                      onClick={() => loadStage(coluna.key, false)}
                      disabled={stage.loading}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-60"
                    >
                      {stage.loading ? 'Carregando...' : 'Carregar mais'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showNovoLead && (
        <NovoLeadModal
          onClose={() => setShowNovoLead(false)}
          onSaved={() => loadAllStages(true)}
        />
      )}
    </div>
  )
}
