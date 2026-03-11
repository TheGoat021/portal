'use client'

import { useEffect, useState } from 'react'
import { createLead } from '@/services/leads'

interface Origem {
  id: string
  nome: string
  plataforma: string
}

interface NovoLeadModalProps {
  onClose: () => void
  onSaved: () => void
}

export default function NovoLeadModal({
  onClose,
  onSaved
}: NovoLeadModalProps) {
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [origemId, setOrigemId] = useState('')
  const [origens, setOrigens] = useState<Origem[]>([])
  const [loadingOrigens, setLoadingOrigens] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadOrigens() {
      try {
        setLoadingOrigens(true)
        setError('')

        const res = await fetch('/api/origens')

        if (!res.ok) {
          throw new Error('Erro ao buscar origens')
        }

        const data = await res.json()
        setOrigens(data ?? [])
      } catch (err) {
        console.error(err)
        setError('Erro ao carregar origens')
      } finally {
        setLoadingOrigens(false)
      }
    }

    loadOrigens()
  }, [])

  async function handleSave() {
    if (!nome.trim() || !telefone.trim()) {
      setError('Nome e telefone são obrigatórios')
      return
    }

    if (!origemId) {
      setError('Selecione a origem do lead')
      return
    }

    try {
      setSaving(true)
      setError('')

      await createLead({
        nome: nome.trim(),
        telefone: telefone.trim(),
        email: email.trim() || null,
        origem_id: origemId
      })

      onSaved()
      onClose()
    } catch (err: any) {
      console.error(err)
      setError(err?.message || 'Erro ao criar lead')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="border-b border-gray-100 px-6 py-5">
          <h2 className="text-xl font-semibold text-gray-900">Novo Lead</h2>
          <p className="mt-1 text-sm text-gray-500">
            Cadastre um novo lead para acompanhar no pipeline.
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-500">Nome</label>
            <input
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              placeholder="Digite o nome do lead"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-500">
              Telefone / WhatsApp
            </label>
            <input
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              placeholder="(11) 99999-9999"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-500">Email</label>
            <input
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              placeholder="cliente@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-500">Origem</label>
            <select
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              value={origemId}
              onChange={(e) => setOrigemId(e.target.value)}
              disabled={loadingOrigens}
            >
              <option value="">
                {loadingOrigens ? 'Carregando origens...' : 'Selecione a origem'}
              </option>

              {origens.map((origem) => (
                <option key={origem.id} value={origem.id}>
                  {origem.nome} {origem.plataforma ? `(${origem.plataforma})` : ''}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>

          <button
            onClick={handleSave}
            disabled={saving || loadingOrigens}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Salvando...' : 'Salvar lead'}
          </button>
        </div>
      </div>
    </div>
  )
}