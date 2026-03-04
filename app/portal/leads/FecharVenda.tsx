'use client'

import { useState } from 'react'
import { Lead } from '@/types/lead'
import { createVendaFromLead } from '@/services/vendas'

export default function FecharVenda({
  lead,
  onClose,
  onSaved
}: {
  lead: Lead
  onClose: () => void
  onSaved: () => void
}) {
  const [valor, setValor] = useState('')
  const [produto, setProduto] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!valor || Number(valor) <= 0) {
      alert('Informe um valor válido')
      return
    }

    setLoading(true)

    await createVendaFromLead({
      lead_id: lead.id,
      valor: Number(valor),
      produto
    })

    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-6 w-[400px] rounded">
        <h2 className="text-lg font-medium mb-4">
          Fechar venda
        </h2>

        <p className="text-sm mb-3">
          Cliente: <strong>{lead.cliente.nome}</strong>
        </p>

        <input
          className="border p-2 w-full mb-2"
          placeholder="Valor"
          type="number"
          value={valor}
          onChange={e => setValor(e.target.value)}
        />

        <input
          className="border p-2 w-full mb-4"
          placeholder="Produto (opcional)"
          value={produto}
          onChange={e => setProduto(e.target.value)}
        />

        <div className="flex justify-end gap-2">
          <button onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
