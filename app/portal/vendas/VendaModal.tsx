'use client'

import { useState } from 'react'
import ClienteSelect from '@/components/ClienteSelect'
import { createVenda } from '@/services/vendas'

interface VendaModalProps {
  onClose: () => void
  onSaved: () => void
}

export default function VendaModal({ onClose, onSaved }: VendaModalProps) {
  const [clienteId, setClienteId] = useState<string>('')
  const [valor, setValor] = useState<string>('')
  const [produto, setProduto] = useState<string>('')

  const [telefone, setTelefone] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [vendedor, setVendedor] = useState<string>('')
  const [cpf, setCpf] = useState<string>('')
  const [endereco, setEndereco] = useState<string>('')

  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!clienteId) {
      alert('Selecione um cliente')
      return
    }

    if (!valor || Number(valor) <= 0) {
      alert('Informe um valor válido')
      return
    }

    try {
      setSaving(true)

      await createVenda({
        cliente_id: clienteId,
        valor: Number(valor),
        produto,
        telefone,
        email,
        vendedor,
        cpf,
        endereco
      })

      onSaved()
      onClose()
    } catch (err) {
      console.error(err)
      alert('Erro ao salvar a venda')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-[2px]">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="border-b border-gray-100 px-6 py-5">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900">
            Nova venda
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Cadastre a venda e complemente os dados do cliente.
          </p>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Cliente
            </label>

            <div className="rounded-xl border border-gray-300 bg-white p-2">
              <ClienteSelect onChange={setClienteId} />
            </div>
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
                placeholder="0,00"
                type="number"
                min="0"
                step="0.01"
                value={valor}
                onChange={e => setValor(e.target.value)}
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
                placeholder="cliente@email.com"
                type="email"
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
            {saving ? 'Salvando...' : 'Salvar venda'}
          </button>
        </div>
      </div>
    </div>
  )
}