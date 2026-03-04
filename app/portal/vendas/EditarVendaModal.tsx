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
  const [produto, setProduto] = useState<string>(
    venda.produto ?? ''
  )

  const [valor, setValor] = useState<number>(
    venda.valor ?? 0
  )

  const [data, setData] = useState<string>(
    venda.data_fechamento
      ? venda.data_fechamento.split('T')[0]
      : ''
  )

  async function handleSave() {
    if (!valor || valor <= 0) {
      alert('Informe um valor válido')
      return
    }

    await updateVenda(venda.id, {
      produto: produto || undefined,
      valor,
      data_fechamento: data || undefined
    })

    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 w-[420px] rounded">
        <h2 className="text-lg font-semibold mb-4">
          Editar venda
        </h2>

        <p className="text-sm mb-3">
          Cliente:{' '}
          <strong>{venda.cliente?.nome ?? '—'}</strong>
        </p>

        <input
          className="border p-2 w-full mb-2"
          placeholder="Produto"
          value={produto}
          onChange={e => setProduto(e.target.value)}
        />

        <input
          className="border p-2 w-full mb-2"
          type="number"
          placeholder="Valor"
          value={valor}
          onChange={e => setValor(Number(e.target.value))}
        />

        <input
          className="border p-2 w-full mb-4"
          type="date"
          value={data}
          onChange={e => setData(e.target.value)}
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2"
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
