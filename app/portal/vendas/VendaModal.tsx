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
      await createVenda({
        cliente_id: clienteId,
        valor: Number(valor),
        produto
      })

      onSaved()
      onClose()
    } catch (err) {
      console.error(err)
      alert('Erro ao salvar a venda')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-6 w-[400px] rounded">
        <h2 className="text-xl mb-4">Nova Venda</h2>

        <ClienteSelect onChange={setClienteId} />

        <input
          className="border p-2 w-full mt-2"
          placeholder="Produto"
          value={produto}
          onChange={e => setProduto(e.target.value)}
        />

        <input
          className="border p-2 w-full mt-2"
          placeholder="Valor"
          type="number"
          min="0"
          step="0.01"
          value={valor}
          onChange={e => setValor(e.target.value)}
        />

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-3 py-2 border rounded"
          >
            Cancelar
          </button>

          <button
            onClick={handleSave}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
