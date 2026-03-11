'use client'

import { useMemo, useState } from 'react'
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

  const nome = lead.cliente?.nome?.trim() || 'Sem nome'
  const telefone = lead.cliente?.telefone?.trim() || '—'
  const email = lead.cliente?.email?.trim() || '—'
  const origem = lead.origem?.nome?.trim() || 'Sem origem'

  const initials = useMemo(() => {
    return (nome[0] || 'C').toUpperCase()
  }, [nome])

  return (
    <>
      <div className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 font-semibold text-gray-700">
            {initials}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-gray-900">
              {nome}
            </h3>

            <div className="mt-1 space-y-1">
              <p className="truncate text-sm text-gray-600">{telefone}</p>
              <p className="truncate text-xs text-gray-400">{email}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <OrigemBadge origem={origem} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
          {lead.status === 'novo' && (
            <button
              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
              onClick={() => onMove(lead.id, 'em_contato')}
            >
              Em contato
            </button>
          )}

          {lead.status === 'em_contato' && (
            <button
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-100"
              onClick={() => onMove(lead.id, 'proposta')}
            >
              Enviar proposta
            </button>
          )}

          {lead.status === 'proposta' && (
            <button
              className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition hover:bg-green-100"
              onClick={() => setOpen(true)}
            >
              Ganhar
            </button>
          )}

          {lead.status !== 'ganho' && lead.status !== 'perdido' && (
            <button
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
              onClick={() => onMove(lead.id, 'perdido')}
            >
              Perder
            </button>
          )}
        </div>
      </div>

      {open && (
        <FecharVenda
          lead={lead}
          onClose={() => setOpen(false)}
          onSaved={onUpdated}
        />
      )}
    </>
  )
}