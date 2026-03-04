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
]

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [showNovoLead, setShowNovoLead] = useState(false)

  useEffect(() => {
    loadLeads()
  }, [])

  async function loadLeads() {
    const data = await getLeads()
    setLeads(data)
  }

  async function moverLead(id: string, status: Lead['status']) {
    await updateLeadStatus(id, status)
    loadLeads()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Pipeline de Leads</h1>

        <button
          onClick={() => setShowNovoLead(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + Novo Lead
        </button>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {colunas.map(coluna => (
          <div key={coluna.key} className="bg-gray-50 p-3 rounded">
            <h2 className="font-medium mb-2">{coluna.label}</h2>

            {leads
              .filter(l => l.status === coluna.key)
              .map(lead => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onMove={moverLead}
                  onUpdated={loadLeads}
                />
              ))}
          </div>
        ))}
      </div>

      {showNovoLead && (
        <NovoLeadModal
          onClose={() => setShowNovoLead(false)}
          onSaved={loadLeads}
        />
      )}
    </div>
  )
}
