'use client'

import { useEffect, useState } from 'react'
import { getVendas } from '@/services/vendas'
import Money from '@/components/Money'
import OrigemBadge from '@/components/OrigemBadge'
import VendaModal from './VendaModal'
import EditarVendaModal from './EditarVendaModal'

export default function VendasPage() {
  const [vendas, setVendas] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [quantidade, setQuantidade] = useState(0)

  const [open, setOpen] = useState(false)
  const [editingVenda, setEditingVenda] = useState<any | null>(null)

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [origemId, setOrigemId] = useState('')

  async function loadVendas() {
    const res = await getVendas({
      startDate,
      endDate,
      origemId
    })

    setVendas(res.vendas)
    setTotal(res.total)
    setQuantidade(res.quantidade)
  }

  useEffect(() => {
    loadVendas()
  }, [])

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Vendas</h1>

        <button
          onClick={() => setOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + Nova Venda
        </button>
      </div>

      <div className="bg-gray-50 p-4 rounded mb-4 flex gap-4 items-end">
        <div>
          <label className="text-sm">Data início</label>
          <input
            type="date"
            className="border p-2 block"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm">Data fim</label>
          <input
            type="date"
            className="border p-2 block"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm">Origem</label>
          <select
            className="border p-2 block"
            value={origemId}
            onChange={e => setOrigemId(e.target.value)}
          >
            <option value="">Todas</option>
            <option value="google">Google</option>
            <option value="meta">Meta</option>
            <option value="manual">Indicação</option>
          </select>
        </div>

        <button
          onClick={loadVendas}
          className="bg-gray-800 text-white px-4 py-2 rounded"
        >
          Aplicar
        </button>
      </div>

      <div className="mb-4 flex gap-6">
        <div>
          <span className="text-sm text-gray-500">Total vendido</span>
          <div className="text-xl font-semibold">
            <Money value={total} />
          </div>
        </div>

        <div>
          <span className="text-sm text-gray-500">Quantidade</span>
          <div className="text-xl font-semibold">{quantidade}</div>
        </div>
      </div>

      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-center">Cliente</th>
            <th className="p-2 text-center">Origem</th>
            <th className="p-2 text-center">Produto</th>
            <th className="p-2 text-center">Valor</th>
            <th className="p-2 text-center">Data</th>
            <th className="p-2 text-center">Ações</th>
          </tr>
        </thead>

        <tbody>
          {vendas.map(v => (
            <tr key={v.id} className="border-t">
              <td className="p-2 text-center">{v.cliente?.nome || '—'}</td>
              <td className="p-2 text-center">
                <OrigemBadge origem={v.origem?.nome} />
              </td>
              <td className="p-2 text-center">{v.produto || '—'}</td>
              <td className="p-2 text-center">
                <Money value={v.valor} />
              </td>
              <td className="p-2 text-center">
                {v.data_fechamento
                  ? new Date(v.data_fechamento).toLocaleDateString('pt-BR')
                  : '—'}
              </td>
              <td className="p-2 text-center">
                <button
                  onClick={() => setEditingVenda(v)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  ✏️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {open && (
        <VendaModal
          onClose={() => setOpen(false)}
          onSaved={loadVendas}
        />
      )}

      {editingVenda && (
        <EditarVendaModal
          venda={editingVenda}
          onClose={() => setEditingVenda(null)}
          onSaved={loadVendas}
        />
      )}
    </div>
  )
}
