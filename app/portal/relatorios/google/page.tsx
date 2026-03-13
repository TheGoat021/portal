'use client'

import RelatoriosNav from '@/components/RelatoriosNav'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  CalendarRange,
  BadgeDollarSign,
  TrendingUp,
  Wallet,
  Target,
  ShoppingCart,
  Users,
  Percent,
  BarChart3,
  Funnel,
  UserRound,
  Filter,
  Chrome
} from 'lucide-react'

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2
  }).format(value)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR').format(value)
}

function formatPercent(value: number) {
  return `${value.toFixed(2).replace('.', ',')}%`
}

function getNumber(value: any) {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

function getString(value: any) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function normalizeDateLabel(value: string) {
  if (!value) return '—'

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [, month, day] = value.split('-')
    return `${day}/${month}`
  }

  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const onlyDate = value.slice(0, 10)
    const [, month, day] = onlyDate.split('-')
    return `${day}/${month}`
  }

  return value
}

function getDefaultDates() {
  const end = new Date()
  const start = new Date()

  start.setDate(end.getDate() - 30)

  const format = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return {
    startDate: format(start),
    endDate: format(end)
  }
}

function isGoogleOrigem(nome?: string | null) {
  return getString(nome).toLowerCase().includes('google')
}

type ResumoVendedor = {
  vendedor: string
  vendas: number
  receita: number
  conversao: number
}

type VendaItem = {
  id: string
  valor: number
  produto?: string | null
  data_fechamento?: string | null
  created_at?: string | null
  cliente?: {
    nome?: string | null
    telefone?: string | null
    email?: string | null
    endereco?: string | null
    cpf?: string | null
    vendedor?: string | null
  } | null
  origem?: {
    id?: string | null
    nome?: string | null
  } | null
}

type TrendItem = {
  date: string
  conversions: number
}

export default function RelatorioGooglePage() {
  const defaultDates = getDefaultDates()

  const [startDate, setStartDate] = useState(defaultDates.startDate)
  const [endDate, setEndDate] = useState(defaultDates.endDate)
  const [vendedor, setVendedor] = useState('')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [investimento, setInvestimento] = useState(0)
  const [leads, setLeads] = useState(0)
  const [vendas, setVendas] = useState(0)
  const [receitaBruta, setReceitaBruta] = useState(0)

  const [evolucao, setEvolucao] = useState<
    { label: string; investimento: number; receita: number }[]
  >([])

  const [resumoPorVendedor, setResumoPorVendedor] = useState<ResumoVendedor[]>([])
  const [funil, setFunil] = useState<{ label: string; value: number }[]>([])

  const [vendedoresDisponiveis, setVendedoresDisponiveis] = useState<string[]>([])

  async function loadData() {
    try {
      setLoading(true)
      setError('')

      const dashboardQuery = new URLSearchParams()
      dashboardQuery.set('customerId', '1730254242')
      dashboardQuery.set('platform', 'google')
      dashboardQuery.set('startDate', startDate)
      dashboardQuery.set('endDate', endDate)

      const vendasQuery = new URLSearchParams()
      vendasQuery.set('startDate', startDate)
      vendasQuery.set('endDate', endDate)

      const [overviewRes, trendRes, vendasRes] = await Promise.all([
        fetch(`/api/dashboard/overview?${dashboardQuery.toString()}`),
        fetch(`/api/dashboard/trend?${dashboardQuery.toString()}`),
        fetch(`/api/vendas?${vendasQuery.toString()}`)
      ])

      if (!overviewRes.ok) {
        const errText = await overviewRes.text()
        throw new Error(`Erro ao carregar overview do dashboard: ${errText || overviewRes.status}`)
      }

      if (!trendRes.ok) {
        const errText = await trendRes.text()
        throw new Error(`Erro ao carregar tendência do dashboard: ${errText || trendRes.status}`)
      }

      if (!vendasRes.ok) {
        const errText = await vendasRes.text()
        throw new Error(`Erro ao carregar vendas: ${errText || vendasRes.status}`)
      }

      const overviewJson = await overviewRes.json()
      const trendJson = await trendRes.json()
      const vendasJson = await vendasRes.json()

      const overview = overviewJson?.data ?? {}
      const kpis = overview?.kpis ?? {}
      const funnelData = overview?.funnel ?? {}

      const trendList: TrendItem[] = Array.isArray(trendJson?.data)
        ? trendJson.data
        : []

      const vendasList: VendaItem[] = Array.isArray(vendasJson?.vendas)
        ? vendasJson.vendas
        : []

      const vendasGoogle = vendasList.filter(v => isGoogleOrigem(v.origem?.nome))

      const vendedorOptions = Array.from(
        new Set(
          vendasGoogle
            .map(v => getString(v.cliente?.vendedor))
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b))

      setVendedoresDisponiveis(vendedorOptions)

      const vendasFiltradas = vendasGoogle.filter(v => {
        const nomeVendedor = getString(v.cliente?.vendedor).toLowerCase()
        return vendedor ? nomeVendedor === vendedor.toLowerCase() : true
      })

      const receita = vendasFiltradas.reduce(
        (sum, item) => sum + getNumber(item.valor),
        0
      )

      const totalInvestimento = getNumber(kpis.investimento)
      const totalLeads = getNumber(funnelData.leads)

      setInvestimento(totalInvestimento)
      setLeads(totalLeads)
      setVendas(vendasFiltradas.length)
      setReceitaBruta(receita)

      const receitaPorDiaMap = new Map<string, number>()

      for (const venda of vendasFiltradas) {
        const rawDate =
          getString(venda.data_fechamento) ||
          getString(venda.created_at)

        const dateKey = rawDate ? rawDate.slice(0, 10) : ''
        if (!dateKey) continue

        receitaPorDiaMap.set(
          dateKey,
          (receitaPorDiaMap.get(dateKey) ?? 0) + getNumber(venda.valor)
        )
      }

      const diasComTrend = trendList.length > 0 ? trendList.length : 1
      const investimentoPorDia = totalInvestimento / diasComTrend

      const evolucaoNormalizada = trendList.map(item => {
        const rawDate = getString(item.date)
        const dateKey = rawDate ? rawDate.slice(0, 10) : ''

        return {
          label: normalizeDateLabel(dateKey || rawDate || '—'),
          investimento: investimentoPorDia,
          receita: receitaPorDiaMap.get(dateKey) ?? 0
        }
      })

      setEvolucao(evolucaoNormalizada)

      const vendedorMap = new Map<
        string,
        { vendedor: string; vendas: number; receita: number }
      >()

      for (const vendaItem of vendasFiltradas) {
        const nomeVendedor = getString(vendaItem.cliente?.vendedor) || 'Sem vendedor'

        if (!vendedorMap.has(nomeVendedor)) {
          vendedorMap.set(nomeVendedor, {
            vendedor: nomeVendedor,
            vendas: 0,
            receita: 0
          })
        }

        const current = vendedorMap.get(nomeVendedor)!
        current.vendas += 1
        current.receita += getNumber(vendaItem.valor)
      }

      const resumoVendedorFinal = Array.from(vendedorMap.values())
        .map(item => ({
          ...item,
          conversao: totalLeads > 0 ? (item.vendas / totalLeads) * 100 : 0
        }))
        .sort((a, b) => b.receita - a.receita)

      setResumoPorVendedor(resumoVendedorFinal)

      setFunil([
        { label: 'Impressões', value: getNumber(funnelData.impressions) },
        { label: 'Cliques', value: getNumber(funnelData.clicks) },
        { label: 'Leads', value: getNumber(funnelData.leads) },
        { label: 'Vendas', value: vendasFiltradas.length }
      ])
    } catch (err: any) {
      console.error('Erro ao carregar relatório:', err)
      setError(err?.message || 'Erro ao carregar relatório')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ticketMedio = vendas > 0 ? receitaBruta / vendas : 0
  const receitaLiquida = receitaBruta - investimento
  const conversao = leads > 0 ? (vendas / leads) * 100 : 0
  const custoPorLead = leads > 0 ? investimento / leads : 0
  const custoPorVenda = vendas > 0 ? investimento / vendas : 0
  const roas = investimento > 0 ? receitaBruta / investimento : 0
  const roi = investimento > 0 ? (receitaLiquida / investimento) * 100 : 0

  const maxReceita = useMemo(
    () => Math.max(...evolucao.map(item => item.receita), 1),
    [evolucao]
  )

  const maxInvestimento = useMemo(
    () => Math.max(...evolucao.map(item => item.investimento), 1),
    [evolucao]
  )

  const maxFunil = useMemo(
    () => Math.max(...funil.map(item => item.value), 1),
    [funil]
  )

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50/60">
        <span className="text-sm text-gray-500">Carregando relatório...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/60 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  <BarChart3 className="h-4 w-4" />
                  Relatório Google
                </div>

                <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
                  Google - Performance de Marketing e Vendas
                </h1>
                <p className="mt-2 max-w-3xl text-sm text-gray-500">
                  Acompanhe investimento, receita, conversão, ROI, ROAS e a evolução do canal Google com visão comercial e financeira.
                </p>

                {error && (
                  <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
                )}
              </div>

              <RelatoriosNav />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Data início
                </label>
                <div className="relative">
                  <CalendarRange className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Data fim
                </label>
                <div className="relative">
                  <CalendarRange className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Vendedor
                </label>
                <select
                  value={vendedor}
                  onChange={e => setVendedor(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Todos</option>
                  {vendedoresDisponiveis.map(item => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 xl:col-span-3 flex items-end">
                <button
                  onClick={loadData}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
                >
                  <Filter className="h-4 w-4" />
                  Aplicar filtros
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Investimento"
            value={formatMoney(investimento)}
            description="Total investido em marketing"
            icon={<BadgeDollarSign className="h-5 w-5" />}
          />
          <KpiCard
            title="Receita bruta"
            value={formatMoney(receitaBruta)}
            description="Valor total vendido"
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <KpiCard
            title="Receita líquida"
            value={formatMoney(receitaLiquida)}
            description="Receita bruta - marketing"
            icon={<Wallet className="h-5 w-5" />}
          />
          <KpiCard
            title="Conversão"
            value={formatPercent(conversao)}
            description="Vendas sobre leads"
            icon={<Target className="h-5 w-5" />}
          />

          <KpiCard
            title="Leads"
            value={formatNumber(leads)}
            description="Leads gerados no período"
            icon={<Users className="h-5 w-5" />}
          />
          <KpiCard
            title="Vendas"
            value={formatNumber(vendas)}
            description="Quantidade de vendas"
            icon={<ShoppingCart className="h-5 w-5" />}
          />
          <KpiCard
            title="Ticket médio"
            value={formatMoney(ticketMedio)}
            description="Receita por venda"
            icon={<BadgeDollarSign className="h-5 w-5" />}
          />
          <KpiCard
            title="ROI"
            value={formatPercent(roi)}
            description="Retorno sobre investimento"
            icon={<Percent className="h-5 w-5" />}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-2">
            <div className="mb-5">
              <h2 className="text-base font-semibold text-gray-900">
                Evolução de investimento x receita
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Comparativo diário entre o investimento e a receita gerada.
              </p>
            </div>

            <div className="overflow-x-auto">
              {evolucao.length > 0 ? (
                <div
                  className="grid h-[320px] items-end gap-4"
                  style={{
                    gridTemplateColumns: `repeat(${evolucao.length}, minmax(72px, 1fr))`,
                    minWidth: `${Math.max(evolucao.length * 90, 700)}px`
                  }}
                >
                  {evolucao.map(item => {
                    const receitaHeight = Math.max(
                      16,
                      (item.receita / maxReceita) * 240
                    )
                    const investimentoHeight = Math.max(
                      10,
                      (item.investimento / maxInvestimento) * 120
                    )

                    return (
                      <div
                        key={item.label}
                        className="flex h-full flex-col items-center justify-end"
                      >
                        <div className="mb-3 flex h-[260px] items-end gap-2">
                          <div className="flex flex-col items-center gap-2">
                            <div
                              className="w-5 rounded-t-md bg-gray-300"
                              style={{ height: `${investimentoHeight}px` }}
                              title={`Investimento: ${formatMoney(item.investimento)}`}
                            />
                            <span className="text-[10px] font-medium text-gray-400">
                              Inv.
                            </span>
                          </div>

                          <div className="flex flex-col items-center gap-2">
                            <div
                              className="w-5 rounded-t-md bg-blue-600"
                              style={{ height: `${receitaHeight}px` }}
                              title={`Receita: ${formatMoney(item.receita)}`}
                            />
                            <span className="text-[10px] font-medium text-blue-600">
                              Rec.
                            </span>
                          </div>
                        </div>

                        <span className="text-xs font-medium text-gray-500">
                          {item.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex h-[320px] items-center justify-center text-sm text-gray-500">
                  Nenhum dado de tendência encontrado.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-base font-semibold text-gray-900">
                Indicadores complementares
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Métricas de eficiência do canal.
              </p>
            </div>

            <div className="space-y-4">
              <MetricRow
                label="ROAS"
                value={`${roas.toFixed(2).replace('.', ',')}x`}
              />
              <MetricRow
                label="Custo por lead"
                value={formatMoney(custoPorLead)}
              />
              <MetricRow
                label="Custo por venda"
                value={formatMoney(custoPorVenda)}
              />
              <MetricRow
                label="Margem líquida"
                value={formatPercent(
                  receitaBruta > 0 ? (receitaLiquida / receitaBruta) * 100 : 0
                )}
              />
              <MetricRow
                label="Receita por lead"
                value={formatMoney(leads > 0 ? receitaBruta / leads : 0)}
              />
              <MetricRow
                label="Participação do Google"
                value="100,00%"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <Funnel className="h-5 w-5 text-gray-700" />
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Funil comercial
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Visualização da queda entre as etapas do processo.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {funil.map((item, index) => {
                const width = `${(item.value / maxFunil) * 100}%`
                const previous = index > 0 ? funil[index - 1].value : item.value
                const taxaEtapa =
                  index > 0 && previous > 0 ? (item.value / previous) * 100 : 100

                return (
                  <div key={item.label}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        {item.label}
                      </span>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="font-semibold text-gray-900">
                          {formatNumber(item.value)}
                        </span>
                        <span className="text-gray-500">
                          {formatPercent(taxaEtapa)}
                        </span>
                      </div>
                    </div>

                    <div className="h-11 rounded-2xl bg-gray-100 p-1">
                      <div
                        className="flex h-full items-center rounded-xl bg-blue-600 px-4 text-sm font-medium text-white"
                        style={{ width }}
                      >
                        {item.label}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <UserRound className="h-5 w-5 text-gray-700" />
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Ranking por vendedor
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Receita, vendas e conversão por responsável.
                </p>
              </div>
            </div>

            <div className="max-h-[360px] space-y-3 overflow-y-auto pr-2">
              {resumoPorVendedor.length > 0 ? (
                resumoPorVendedor.map(item => (
                  <div
                    key={item.vendedor}
                    className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {item.vendedor}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {item.vendas} vendas • {formatPercent(item.conversao)} de conversão
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatMoney(item.receita)}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Receita gerada
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 text-sm text-gray-500">
                  Nenhuma venda encontrada para os filtros aplicados.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  title,
  value,
  description,
  icon
}: {
  title: string
  value: string
  description: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="rounded-2xl bg-blue-50 p-2 text-blue-700">
          {icon}
        </div>
      </div>

      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">
        {value}
      </p>
      <p className="mt-2 text-sm text-gray-500">{description}</p>
    </div>
  )
}

function MetricRow({
  label,
  value
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50/70 px-4 py-3">
      <span className="text-sm font-medium text-gray-600">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  )
}
