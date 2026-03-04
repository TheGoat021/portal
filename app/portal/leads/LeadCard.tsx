'use client'

import { useState } from 'react'
import { Lead } from '@/types/lead'
import OrigemBadge from '@/components/OrigemBadge'
import FecharVenda from './FecharVenda'

export default function LeadCard({
  lead,
  onMove,
  onUpdated
}: {
  lead: Lead
  onMove: (id: string, status: Lead['status']) => void
  onUpdated: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-white p-3 rounded shadow mb-2">
      <div className="font-medium">{lead.cliente.nome}</div>
      <div className="text-sm text-gray-500">
        {lead.cliente.telefone || '—'}
      </div>

      <div className="mt-2">
        <OrigemBadge origem={lead.origem.nome} />
      </div>

      <div className="flex gap-2 mt-3 flex-wrap">
        {lead.status === 'novo' && (
          <button
            className="text-xs text-blue-600"
            onClick={() => onMove(lead.id, 'em_contato')}
          >
            Em contato
          </button>
        )}

        {lead.status === 'em_contato' && (
          <button
            className="text-xs text-blue-600"
            onClick={() => onMove(lead.id, 'proposta')}
          >
            Enviar proposta
          </button>
        )}

        {lead.status === 'proposta' && (
          <button
            className="text-xs text-green-600"
            onClick={() => setOpen(true)}
          >
            Ganhar
          </button>
        )}

        {lead.status !== 'ganho' && lead.status !== 'perdido' && (
          <button
            className="text-xs text-red-600"
            onClick={() => onMove(lead.id, 'perdido')}
          >
            Perder
          </button>
        )}
      </div>

      {open && (
        <FecharVenda
          lead={lead}
          onClose={() => setOpen(false)}
          onSaved={onUpdated}
        />
      )}
    </div>
  )
}
