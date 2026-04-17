'use client'

import RelatoriosNav from '@/components/RelatoriosNav'
import * as XLSX from 'xlsx'
import { useEffect, useMemo, useState } from 'react'
import { CalendarRange, Download, Loader2, Users } from 'lucide-react'

type Connection = {
  id: string
  display_phone_number?: string | null
  verified_name?: string | null
}

type ReportRow = {
  agent_id: string | null
  agent_email: string
  novos_clientes: number
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

  return { startDate: format(start), endDate: format(end) }
}

export default function RelatorioMetaAtendimentoPage() {
  const defaults = useMemo(() => getDefaultDates(), [])
  const [connections, setConnections] = useState<Connection[]>([])
  const [connectionId, setConnectionId] = useState('')
  const [startDate, setStartDate] = useState(defaults.startDate)
  const [endDate, setEndDate] = useState(defaults.endDate)
  const [rows, setRows] = useState<ReportRow[]>([])
  const [totalNovos, setTotalNovos] = useState(0)
  const [totalSemAtendente, setTotalSemAtendente] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isDateRangeInvalid = Boolean(startDate && endDate && startDate > endDate)

  async function loadConnections() {
    const res = await fetch('/api/meta/embedded-signup/connections', { cache: 'no-store' })
    if (!res.ok) throw new Error(await res.text())
    const payload = await res.json()
    const items: Connection[] = payload?.data ?? []
    setConnections(items)
    if (!connectionId && items.length > 0) setConnectionId(items[0].id)
  }

  async function loadReport() {
    if (!connectionId) return
    if (isDateRangeInvalid) {
      setError('Período inválido: a data inicial não pode ser maior que a final.')
      return
    }
    try {
      setLoading(true)
      setError('')
      const query = new URLSearchParams({
        connectionId,
        startDate,
        endDate
      })
      const res = await fetch(`/api/whatsapp-meta/reports/new-clients-by-agent?${query.toString()}`, {
        cache: 'no-store'
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok || !payload?.ok) {
        throw new Error(payload?.error || 'Erro ao carregar relatório')
      }
      setRows(Array.isArray(payload?.data?.rows) ? payload.data.rows : [])
      setTotalNovos(Number(payload?.data?.total_novos_clientes ?? 0))
      setTotalSemAtendente(Number(payload?.data?.total_sem_atendente ?? 0))
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar relatório')
    } finally {
      setLoading(false)
    }
  }

  function exportExcel() {
    const exportRows = rows.map((row) => ({
      Funcionario: row.agent_email,
      'ID Usuario': row.agent_id || '',
      'Clientes Novos Atendidos': row.novos_clientes
    }))

    const summaryRows = [
      { Campo: 'Periodo Inicio', Valor: startDate },
      { Campo: 'Periodo Fim', Valor: endDate },
      { Campo: 'Total Novos Clientes', Valor: totalNovos },
      { Campo: 'Sem Atendente', Valor: totalSemAtendente }
    ]

    const workbook = XLSX.utils.book_new()
    const sheetSummary = XLSX.utils.json_to_sheet(summaryRows)
    const sheetData = XLSX.utils.json_to_sheet(exportRows)
    XLSX.utils.book_append_sheet(workbook, sheetSummary, 'Resumo')
    XLSX.utils.book_append_sheet(workbook, sheetData, 'Atendentes')

    const fileName = `relatorio_meta_atendimento_${startDate}_a_${endDate}.xlsx`
    XLSX.writeFile(workbook, fileName)
  }

  useEffect(() => {
    loadConnections().catch((err) => setError(err?.message || 'Erro ao carregar conexões'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!connectionId) return
    loadReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionId])

  useEffect(() => {
    if (!connectionId) return
    if (!startDate || !endDate) return
    if (isDateRangeInvalid) return

    const timeout = setTimeout(() => {
      loadReport()
    }, 250)

    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionId, startDate, endDate, isDateRangeInvalid])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Relatório de Atendimento Meta</h1>
            <p className="text-sm text-gray-600">
              Clientes novos atendidos por funcionário (primeiro atendimento no período).
            </p>
          </div>
          <RelatoriosNav />
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Conexão Meta</label>
            <select
              value={connectionId}
              onChange={(e) => setConnectionId(e.target.value)}
              className="w-full h-10 rounded-xl border border-gray-300 px-3"
            >
              <option value="">Selecione...</option>
              {connections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.display_phone_number || c.verified_name || c.id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Data inicial</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-10 rounded-xl border border-gray-300 px-3"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Data final</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-10 rounded-xl border border-gray-300 px-3"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadReport}
            disabled={loading || !connectionId || isDateRangeInvalid}
            className="h-10 px-4 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarRange className="h-4 w-4" />}
            Atualizar
          </button>

          <button
            onClick={exportExcel}
            disabled={loading || rows.length === 0}
            className="h-10 px-4 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 inline-flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Exportar Excel
          </button>
        </div>

        {error ? <div className="text-sm text-red-600">{error}</div> : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="text-sm text-gray-500">Total de clientes novos</div>
          <div className="text-2xl font-semibold text-gray-900">{totalNovos}</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="text-sm text-gray-500">Clientes sem atendente identificado</div>
          <div className="text-2xl font-semibold text-gray-900">{totalSemAtendente}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-800">Clientes novos por funcionário</h2>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Funcionário</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ID usuário</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Clientes novos</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                    {loading ? 'Carregando...' : 'Nenhum dado para o período selecionado.'}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={`${row.agent_email}-${row.agent_id || 'no-id'}`} className="border-t border-gray-100">
                    <td className="px-4 py-3">{row.agent_email}</td>
                    <td className="px-4 py-3 text-gray-500">{row.agent_id || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold">{row.novos_clientes}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
