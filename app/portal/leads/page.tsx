'use client'

import { useEffect, useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { getLeads, updateLeadStatus } from '@/services/leads'
import LeadCard from './LeadCard'
import { Lead } from '@/types/lead'
import NovoLeadModal from './NovoLeadModal'

const colunas = [
  { key: 'novo', label: 'Novo' },
  { key: 'em_contato', label: 'Em contato' },
  { key: 'proposta', label: 'Proposta' },
  { key: 'ganho', label: 'Ganho' },
  { key: 'perdido', label: 'Perdido' }
] as const

function normalizePhone(phone?: string | null) {
  if (!phone) return ''
  return String(phone).replace(/\D/g, '')
}

type LeadWithAgent = Lead & {
  conversation_agent_name?: string | null
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadWithAgent[]>([])
  const [showNovoLead, setShowNovoLead] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState('all')

  useEffect(() => {
    loadLeads()
  }, [])

  async function syncWhatsAppLeads() {
    try {
      const res = await fetch('/api/leads/sync-whatsapp', {
        method: 'POST'
      })

      if (!res.ok) {
        const err = await res.json().catch(() => null)
        console.error('Erro ao sincronizar leads do WhatsApp:', err)
        return
      }

      const data = await res.json()
      console.log('✅ Sync WhatsApp:', data)
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

    const agentMap = new Map<string, string | null>()

    await Promise.all(
      uniquePhones.map(async (phone) => {
        try {
          const res = await fetch(
            `/api/whatsapp/assigned-agent-by-phone?phone=${encodeURIComponent(phone)}`,
            { cache: 'no-store' }
          )

          if (!res.ok) {
            agentMap.set(phone, null)
            return
          }

          const json = await res.json()
          agentMap.set(phone, json?.agent_name || null)
        } catch {
          agentMap.set(phone, null)
        }
      })
    )

    return data.map((lead) => {
      const phone = normalizePhone(lead.cliente?.telefone)

      return {
        ...lead,
        conversation_agent_name: phone ? agentMap.get(phone) || null : null
      }
    })
  }

  async function loadLeads() {
    try {
      setLoading(true)

      await syncWhatsAppLeads()

      const data = await getLeads()
      const enriched = await enrichLeadsWithAssignedAgent(data || [])
      setLeads(enriched)
    } catch (error) {
      console.error('Erro ao carregar leads:', error)
      setLeads([])
    } finally {
      setLoading(false)
    }
  }

  async function moverLead(id: string, status: Lead['status']) {
    try {
      await updateLeadStatus(id, status)
      await loadLeads()
    } catch (error) {
      console.error('Erro ao mover lead:', error)
    }
  }

  const agentes = useMemo(() => {
    return Array.from(
      new Set(
        leads
          .map((lead) => lead.conversation_agent_name?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [leads])

  const leadsFiltrados = useMemo(() => {
    if (selectedAgent === 'all') return leads

    return leads.filter(
      (lead) => (lead.conversation_agent_name || '') === selectedAgent
    )
  }, [leads, selectedAgent])

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
            const leadsDaColuna = leadsFiltrados.filter(
              (l) => l.status === coluna.key
            )

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
                    {leadsDaColuna.length}
                  </span>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto p-3">
                  {leadsDaColuna.length > 0 ? (
                    leadsDaColuna.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        onMove={moverLead}
                        onUpdated={loadLeads}
                      />
                    ))
                  ) : (
                    <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-gray-200 text-sm text-gray-400">
                      Nenhum lead
                    </div>
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
          onSaved={loadLeads}
        />
      )}
    </div>
  )
}