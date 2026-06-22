'use client'

import { useEffect, useState } from 'react'
import { CalendarRange, CircleDollarSign, Filter, Sparkles, TrendingUp } from 'lucide-react'
import { getVendas } from '@/services/vendas'
import { CommercialSubmenu } from '@/components/CommercialSubmenu'
import Money from '@/components/Money'
import OrigemBadge from '@/components/OrigemBadge'
import VendaModal from './VendaModal'
import EditarVendaModal from './EditarVendaModal'

type VendasResponse = Awaited<ReturnType<typeof getVendas>>
type VendaItem = VendasResponse['vendas'][number]

export default function VendasPage() {
  const [vendas, setVendas] = useState<VendaItem[]>([])
  const [total, setTotal] = useState(0)
  const [quantidade, setQuantidade] = useState(0)

  const [open, setOpen] = useState(false)
  const [editingVenda, setEditingVenda] = useState<VendaItem | null>(null)

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
    const timeoutId = setTimeout(() => {
      loadVendas()
    }, 0)

    return () => clearTimeout(timeoutId)
  }, [])

  const ticketMedio = quantidade > 0 ? total / quantidade : 0

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(191,219,254,0.22),transparent_26%),radial-gradient(circle_at_top_right,rgba(196,181,253,0.18),transparent_24%),radial-gradient(circle_at_bottom_center,rgba(153,246,228,0.14),transparent_26%),linear-gradient(180deg,#f8fbff_0%,#f4f8ff_48%,#f7fbff_100%)] p-6">
      <div className="mx-auto w-full max-w-[1800px] space-y-6">
        <CommercialSubmenu />

        <div className="relative overflow-hidden rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(245,249,255,0.7))] p-6 shadow-[0_20px_48px_rgba(148,163,184,0.1)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-10 top-0 h-40 w-40 rounded-full bg-cyan-200/28 blur-3xl" />
            <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-violet-200/22 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-36 w-52 rounded-full bg-emerald-200/20 blur-3xl" />
          </div>

          <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-semibold text-cyan-700 shadow-[0_8px_24px_rgba(148,163,184,0.08)]">
                <Sparkles size={14} />
                CRM de Vendas
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
                Vendas
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Acompanhe resultados, filtre periodos e gerencie vendas cadastradas em uma interface mais leve e operacional.
              </p>
            </div>

            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(96,165,250,0.94),rgba(34,211,238,0.9),rgba(167,139,250,0.84))] px-4 py-2.5 text-sm font-medium text-white shadow-[0_18px_32px_rgba(96,165,250,0.22)] transition hover:scale-[1.01]"
            >
              + Nova Venda
            </button>
          </div>

          <div className="relative z-10 mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-[24px] border border-white/70 bg-white/68 p-5 shadow-[0_12px_30px_rgba(148,163,184,0.08)] backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Total vendido</span>
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-100 bg-[linear-gradient(135deg,rgba(236,253,245,0.98),rgba(236,254,255,0.88))] text-emerald-700">
                  <CircleDollarSign size={18} />
                </span>
              </div>
              <div className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                <Money value={total} />
              </div>
              <p className="mt-3 text-sm font-medium text-emerald-700">Receita consolidada no periodo filtrado.</p>
            </div>

            <div className="rounded-[24px] border border-white/70 bg-white/68 p-5 shadow-[0_12px_30px_rgba(148,163,184,0.08)] backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Quantidade</span>
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-100 bg-[linear-gradient(135deg,rgba(239,246,255,0.98),rgba(236,254,255,0.88))] text-cyan-700">
                  <TrendingUp size={18} />
                </span>
              </div>
              <div className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                {quantidade}
              </div>
              <p className="mt-3 text-sm font-medium text-cyan-700">Volume total de vendas registradas.</p>
            </div>

            <div className="rounded-[24px] border border-white/70 bg-white/68 p-5 shadow-[0_12px_30px_rgba(148,163,184,0.08)] backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Ticket medio</span>
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-100 bg-[linear-gradient(135deg,rgba(245,243,255,0.98),rgba(239,246,255,0.88))] text-violet-700">
                  <CalendarRange size={18} />
                </span>
              </div>
              <div className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                <Money value={ticketMedio} />
              </div>
              <p className="mt-3 text-sm font-medium text-violet-700">Media por fechamento no recorte atual.</p>
            </div>
          </div>
        </div>

        <div className="rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.8),rgba(245,249,255,0.64))] p-5 shadow-[0_20px_48px_rgba(148,163,184,0.1)] backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-100 bg-[linear-gradient(135deg,rgba(239,246,255,0.98),rgba(236,254,255,0.88))] text-cyan-700">
              <Filter size={18} />
            </span>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">
                Filtros
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Refine a visualizacao das vendas por periodo e origem.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Data inicio
              </label>
              <input
                type="date"
                className="w-full rounded-2xl border border-white/70 bg-white/78 px-3 py-2.5 text-sm text-slate-900 outline-none transition backdrop-blur-xl focus:border-cyan-200 focus:ring-2 focus:ring-cyan-50"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Data fim
              </label>
              <input
                type="date"
                className="w-full rounded-2xl border border-white/70 bg-white/78 px-3 py-2.5 text-sm text-slate-900 outline-none transition backdrop-blur-xl focus:border-cyan-200 focus:ring-2 focus:ring-cyan-50"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Origem
              </label>
              <select
                className="w-full rounded-2xl border border-white/70 bg-white/78 px-3 py-2.5 text-sm text-slate-900 outline-none transition backdrop-blur-xl focus:border-cyan-200 focus:ring-2 focus:ring-cyan-50"
                value={origemId}
                onChange={e => setOrigemId(e.target.value)}
              >
                <option value="">Todas</option>
                <option value="google">Google</option>
                <option value="meta">Meta</option>
                <option value="manual">Indicacao</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={loadVendas}
                className="w-full rounded-2xl bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,41,59,0.92))] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-95"
              >
                Aplicar filtros
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.8),rgba(245,249,255,0.64))] shadow-[0_20px_48px_rgba(148,163,184,0.1)] backdrop-blur-xl">
          <div className="border-b border-white/70 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-950">
              Historico de vendas
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Visualize e edite as vendas cadastradas no sistema.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1400px] w-full">
              <thead>
                <tr className="bg-white/55">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Vendedor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Telefone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    E-mail
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    CPF
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Endereco
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Origem
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Produto
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Valor
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Data
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Acoes
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/70">
                {vendas.length > 0 ? (
                  vendas.map((v) => (
                    <tr key={v.id} className="transition hover:bg-white/55">
                      <td className="px-4 py-4 text-sm font-medium text-slate-900">
                        {v.cliente?.nome || '—'}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-700">
                        {v.cliente?.vendedor || '—'}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-700">
                        {v.cliente?.telefone || '—'}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-700">
                        <span className="block max-w-[220px] truncate" title={v.cliente?.email || ''}>
                          {v.cliente?.email || '—'}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-700">
                        {v.cliente?.cpf || '—'}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-700">
                        <span
                          className="block max-w-[280px] truncate"
                          title={v.cliente?.endereco || ''}
                        >
                          {v.cliente?.endereco || '—'}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-center text-sm text-slate-700">
                        <div className="flex justify-center">
                          <OrigemBadge origem={v.origem?.nome} />
                        </div>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-700">
                        {v.produto || '—'}
                      </td>

                      <td className="px-4 py-4 text-right text-sm font-semibold text-slate-900">
                        <Money value={v.valor} />
                      </td>

                      <td className="px-4 py-4 text-center text-sm text-slate-700">
                        {v.data_fechamento
                          ? v.data_fechamento.slice(0, 10).split('-').reverse().join('/')
                          : '—'}
                      </td>

                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => setEditingVenda(v)}
                          className="inline-flex items-center justify-center rounded-2xl border border-cyan-200/80 bg-[linear-gradient(135deg,rgba(239,246,255,0.98),rgba(236,254,255,0.9))] px-3 py-2 text-sm font-medium text-cyan-700 transition hover:bg-white"
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
                      className="px-4 py-12 text-center text-sm text-slate-500"
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
