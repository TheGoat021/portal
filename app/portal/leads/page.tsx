'use client'

import { useEffect, useState } from 'react'
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

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [showNovoLead, setShowNovoLead] = useState(false)
  const [loading, setLoading] = useState(true)

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

  async function loadLeads() {
    try {
      setLoading(true)

      await syncWhatsAppLeads()

      const data = await getLeads()
      setLeads(data || [])
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

  return (
    <div className="h-full bg-[#f8fafc] p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Pipeline de Leads
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Acompanhe a evolução dos leads por etapa
          </p>
        </div>

        <button
          onClick={() => setShowNovoLead(true)}
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
        >
          + Novo Lead
        </button>
      </div>

      {loading ? (
        <div className="flex h-[calc(100vh-180px)] items-center justify-center rounded-2xl border border-gray-200 bg-white text-sm text-gray-500">
          Carregando pipeline...
        </div>
      ) : (
        <div className="grid h-[calc(100vh-180px)] grid-cols-5 gap-4">
          {colunas.map((coluna) => {
            const leadsDaColuna = leads.filter((l) => l.status === coluna.key)

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