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
    <div className="min-h-screen bg-gray-50/60 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              Vendas
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Acompanhe resultados, filtre períodos e gerencie vendas cadastradas.
            </p>
          </div>

          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            + Nova Venda
          </button>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
              Filtros
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Refine a visualização das vendas por período e origem.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Data início
              </label>
              <input
                type="date"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Data fim
              </label>
              <input
                type="date"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Origem
              </label>
              <select
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={origemId}
                onChange={e => setOrigemId(e.target.value)}
              >
                <option value="">Todas</option>
                <option value="google">Google</option>
                <option value="meta">Meta</option>
                <option value="manual">Indicação</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={loadVendas}
                className="w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
              >
                Aplicar filtros
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <span className="text-sm font-medium text-gray-500">
              Total vendido
            </span>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">
              <Money value={total} />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <span className="text-sm font-medium text-gray-500">
              Quantidade de vendas
            </span>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">
              {quantidade}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="text-base font-semibold text-gray-900">
              Histórico de vendas
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Visualize e edite as vendas cadastradas no sistema.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1400px] w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Vendedor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Telefone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    E-mail
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    CPF
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Endereço
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Origem
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Produto
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Valor
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Data
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {vendas.length > 0 ? (
                  vendas.map(v => (
                    <tr key={v.id} className="transition hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">
                        {v.cliente?.nome || '—'}
                      </td>

                      <td className="px-4 py-4 text-sm text-gray-700">
                        {v.cliente?.vendedor || '—'}
                      </td>

                      <td className="px-4 py-4 text-sm text-gray-700">
                        {v.cliente?.telefone || '—'}
                      </td>

                      <td className="px-4 py-4 text-sm text-gray-700">
                        <span className="block max-w-[220px] truncate" title={v.cliente?.email || ''}>
                          {v.cliente?.email || '—'}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-sm text-gray-700">
                        {v.cliente?.cpf || '—'}
                      </td>

                      <td className="px-4 py-4 text-sm text-gray-700">
                        <span
                          className="block max-w-[280px] truncate"
                          title={v.cliente?.endereco || ''}
                        >
                          {v.cliente?.endereco || '—'}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-center text-sm text-gray-700">
                        <div className="flex justify-center">
                          <OrigemBadge origem={v.origem?.nome} />
                        </div>
                      </td>

                      <td className="px-4 py-4 text-sm text-gray-700">
                        {v.produto || '—'}
                      </td>

                      <td className="px-4 py-4 text-right text-sm font-semibold text-gray-900">
                        <Money value={v.valor} />
                      </td>

                      <td className="px-4 py-4 text-center text-sm text-gray-700">
                        {v.data_fechamento
  ? v.data_fechamento.slice(0, 10).split('-').reverse().join('/')
  : '—'}
                      </td>

                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => setEditingVenda(v)}
                          className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-blue-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-4 py-12 text-center text-sm text-gray-500"
                    >
                      Nenhuma venda encontrada para os filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

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
    </div>
  )
}