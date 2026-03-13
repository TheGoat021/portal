'use client'

import { useState } from 'react'
import { updateVenda } from '@/services/vendas'

export default function EditarVendaModal({
  venda,
  onClose,
  onSaved
}: {
  venda: any
  onClose: () => void
  onSaved: () => void
}) {
  const [produto, setProduto] = useState<string>(venda.produto ?? '')
  const [valor, setValor] = useState<number>(venda.valor ?? 0)
  const [data, setData] = useState<string>(
    venda.data_fechamento ? venda.data_fechamento.split('T')[0] : ''
  )

  const [telefone, setTelefone] = useState<string>(venda.cliente?.telefone ?? '')
  const [email, setEmail] = useState<string>(venda.cliente?.email ?? '')
  const [vendedor, setVendedor] = useState<string>(venda.cliente?.vendedor ?? '')
  const [cpf, setCpf] = useState<string>(venda.cliente?.cpf ?? '')
  const [endereco, setEndereco] = useState<string>(venda.cliente?.endereco ?? '')

  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!valor || valor <= 0) {
      alert('Informe um valor válido')
      return
    }

    try {
      setSaving(true)

      await updateVenda(venda.id, {
        produto: produto || undefined,
        valor,
        data_fechamento: data || undefined,
        telefone: telefone || undefined,
        email: email || undefined,
        vendedor: vendedor || undefined,
        cpf: cpf || undefined,
        endereco: endereco || undefined
      })

      onSaved()
      onClose()
    } catch (err) {
      console.error(err)
      alert('Erro ao salvar alterações da venda')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-[2px]">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="border-b border-gray-100 px-6 py-5">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900">
            Editar venda
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Atualize as informações da venda e os dados do cliente.
          </p>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="rounded-xl bg-gray-50 px-4 py-3">
            <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Cliente
            </span>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {venda.cliente?.nome ?? '—'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Produto
              </label>
              <input
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Nome do produto ou serviço"
                value={produto}
                onChange={e => setProduto(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Valor
              </label>
              <input
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={valor}
                onChange={e => setValor(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Telefone
              </label>
              <input
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="(11) 99999-9999"
                value={telefone}
                onChange={e => setTelefone(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                E-mail
              </label>
              <input
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                type="email"
                placeholder="cliente@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Vendedor
              </label>
              <input
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Nome do vendedor"
                value={vendedor}
                onChange={e => setVendedor(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                CPF
              </label>
              <input
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={e => setCpf(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Endereço
            </label>
            <input
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Rua, número, bairro, cidade..."
              value={endereco}
              onChange={e => setEndereco(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Data de fechamento
            </label>
            <input
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              type="date"
              value={data}
              onChange={e => setData(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}