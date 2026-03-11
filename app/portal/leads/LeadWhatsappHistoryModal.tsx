'use client'

import { useEffect, useMemo, useState } from 'react'
import { X, MessageCircle, Loader2 } from 'lucide-react'

type MessageItem = {
  id: string
  message: string | null
  direction: string | null
  created_at: string
  type?: string | null
  media_url?: string | null
  agent_name?: string | null
}

type Props = {
  open: boolean
  phone: string
  leadName: string
  onClose: () => void
}

function normalizePhone(phone?: string | null) {
  if (!phone) return ''
  return String(phone).replace(/\D/g, '')
}

function formatMessageTime(dateString?: string) {
  if (!dateString) return ''
  const date = new Date(dateString)

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

function isOutgoingMessage(direction?: string | null) {
  const value = String(direction || '')
    .trim()
    .toLowerCase()

  return [
    'out',
    'outgoing',
    'sent',
    'sender',
    'from_me',
    'agent',
    'atendente',
    'outbound'
  ].includes(value)
}

export default function LeadWhatsappHistoryModal({
  open,
  phone,
  leadName,
  onClose
}: Props) {
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [error, setError] = useState<string | null>(null)

  const normalizedPhone = useMemo(() => normalizePhone(phone), [phone])

  useEffect(() => {
    if (!open) return

    async function loadHistory() {
      try {
        setLoading(true)
        setError(null)
        setMessages([])

        if (!normalizedPhone) {
          setError('Este lead não possui telefone cadastrado.')
          return
        }

        const res = await fetch(
          `/api/whatsapp/history-by-phone?phone=${encodeURIComponent(normalizedPhone)}`,
          {
            cache: 'no-store'
          }
        )

        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.error || 'Erro ao buscar histórico.')
        }

        const data = await res.json()
        setMessages(Array.isArray(data?.messages) ? data.messages : [])
      } catch (err: any) {
        setError(err?.message || 'Não foi possível carregar o histórico.')
      } finally {
        setLoading(false)
      }
    }

    loadHistory()
  }, [open, normalizedPhone])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-green-600">
                <MessageCircle size={18} />
              </div>

              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-gray-900">
                  Histórico do WhatsApp
                </h2>
                <p className="truncate text-sm text-gray-500">
                  {leadName} • {phone || 'Sem telefone'}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:bg-gray-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#efeae2] p-4">
          {loading && (
            <div className="flex h-full items-center justify-center">
              <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
                <Loader2 size={16} className="animate-spin" />
                Carregando histórico...
              </div>
            </div>
          )}

          {!loading && error && (
            <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && messages.length === 0 && (
            <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
              Nenhuma conversa encontrada para este lead.
            </div>
          )}

          {!loading && !error && messages.length > 0 && (
            <div className="space-y-3">
              {messages.map((msg) => {
                const isOutgoing = isOutgoingMessage(msg.direction)

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                        isOutgoing
                          ? 'bg-[#dcf8c6] text-gray-800'
                          : 'bg-white text-gray-800'
                      }`}
                    >
                      {msg.type && msg.type !== 'text' && (
                        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                          {msg.type}
                        </p>
                      )}

                      <p className="whitespace-pre-wrap break-words text-sm">
                        {msg.message || 'Mensagem sem conteúdo de texto'}
                      </p>

                      <div className="mt-2 flex items-center justify-end gap-2 text-[11px] text-gray-500">
                        {msg.agent_name && isOutgoing && (
                          <span className="truncate">{msg.agent_name}</span>
                        )}
                        <span>{formatMessageTime(msg.created_at)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 bg-white px-5 py-3 text-xs text-gray-500">
          Visualização somente leitura
        </div>
      </div>
    </div>
  )
}