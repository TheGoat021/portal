'use client'

import { useEffect, useMemo, useState } from 'react'
import { MessageCircle, UserRound } from 'lucide-react'
import { Lead } from '@/types/lead'
import OrigemBadge from '@/components/OrigemBadge'
import FecharVenda from './FecharVenda'
import LeadWhatsappHistoryModal from './LeadWhatsappHistoryModal'

function normalizePhone(phone?: string | null) {
  if (!phone) return ''
  return String(phone).replace(/\D/g, '')
}

type LeadWithAgent = Lead & {
  conversation_agent_name?: string | null
}

export default function LeadCard({
  lead,
  onMove,
  onUpdated
}: {
  lead: LeadWithAgent
  onMove: (id: string, status: Lead['status']) => void
  onUpdated: () => void
}) {
  const [open, setOpen] = useState(false)
  const [openWhatsappHistory, setOpenWhatsappHistory] = useState(false)
  const [assignedAgent, setAssignedAgent] = useState<string | null>(
    lead.conversation_agent_name || null
  )

  const nome = lead.cliente?.nome?.trim() || 'Sem nome'
  const telefone = lead.cliente?.telefone?.trim() || ''
  const email = lead.cliente?.email?.trim() || '—'
  const origem = lead.origem?.nome?.trim() || 'Sem origem'

  const initials = useMemo(() => {
    return (nome[0] || 'C').toUpperCase()
  }, [nome])

  const hasPhone = Boolean(telefone)

  useEffect(() => {
    if (lead.conversation_agent_name !== undefined) {
      setAssignedAgent(lead.conversation_agent_name || null)
      return
    }

    async function loadAssignedAgent() {
      try {
        const normalizedPhone = normalizePhone(telefone)

        if (!normalizedPhone) {
          setAssignedAgent(null)
          return
        }

        const res = await fetch(
          `/api/whatsapp/assigned-agent-by-phone?phone=${encodeURIComponent(normalizedPhone)}`,
          { cache: 'no-store' }
        )

        if (!res.ok) {
          setAssignedAgent(null)
          return
        }

        const data = await res.json()
        setAssignedAgent(data?.agent_name || null)
      } catch {
        setAssignedAgent(null)
      }
    }

    loadAssignedAgent()
  }, [telefone, lead.conversation_agent_name])

  return (
    <>
      <div className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 font-semibold text-gray-700">
            {initials}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="truncate text-sm font-semibold text-gray-900">
                {nome}
              </h3>

              <button
                type="button"
                disabled={!hasPhone}
                onClick={() => setOpenWhatsappHistory(true)}
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition ${
                  hasPhone
                    ? 'border-green-200 bg-green-50 text-green-600 hover:bg-green-100'
                    : 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                }`}
                title={
                  hasPhone
                    ? 'Ver histórico do WhatsApp'
                    : 'Lead sem telefone'
                }
              >
                <MessageCircle size={18} />
              </button>
            </div>

            <div className="mt-1 space-y-1">
              <p className="truncate text-sm text-gray-600">
                {telefone || '—'}
              </p>
              <p className="truncate text-xs text-gray-400">{email}</p>

              {assignedAgent && (
                <div className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] text-gray-600">
                  <UserRound size={13} className="shrink-0" />
                  <span className="truncate">
                   com <strong>{assignedAgent}</strong>
                  </span>
                </div>
              )}
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

      {openWhatsappHistory && (
        <LeadWhatsappHistoryModal
          open={openWhatsappHistory}
          phone={telefone}
          leadName={nome}
          onClose={() => setOpenWhatsappHistory(false)}
        />
      )}
    </>
  )
}