"use client"

import { useMemo, useState } from "react"
import { CalendarRange, Filter, Search } from "lucide-react"
import { formatPhone, formatSeconds } from "@/lib/voice/api"
import { VoiceCallTableRow } from "@/lib/voice/types"

export default function CallTable({
  rows,
  agents,
  queues
}: {
  rows: VoiceCallTableRow[]
  agents: string[]
  queues: string[]
}) {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [agent, setAgent] = useState("all")
  const [queue, setQueue] = useState("all")
  const [period, setPeriod] = useState("today")

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return rows.filter((row) => {
      const bySearch =
        !query ||
        row.clientName.toLowerCase().includes(query) ||
        row.phone.toLowerCase().includes(query)
      const byStatus = status === "all" || row.status === status
      const byAgent = agent === "all" || row.agentName === agent
      const byQueue = queue === "all" || row.queueName === queue
      const byPeriod = period === "all" || Boolean(row.createdAtLabel)
      return bySearch && byStatus && byAgent && byQueue && byPeriod
    })
  }, [agent, period, queue, rows, search, status])

  return (
    <div className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.18)]">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Historico de ligacoes</h2>
          <p className="mt-1 text-sm text-slate-500">
            Filtros preparados para crescer com gravação, QA e auditoria.
          </p>
        </div>

        <div className="grid gap-3 xl:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
          <label className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-slate-50 px-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar cliente ou telefone"
              className="h-11 w-full bg-transparent text-sm outline-none"
            />
          </label>

          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="h-11 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm text-slate-700 outline-none"
          >
            <option value="today">Hoje</option>
            <option value="7d">7 dias</option>
            <option value="30d">30 dias</option>
            <option value="all">Tudo</option>
          </select>

          <select
            value={agent}
            onChange={(event) => setAgent(event.target.value)}
            className="h-11 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm text-slate-700 outline-none"
          >
            <option value="all">Todos os agentes</option>
            {agents.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={queue}
            onChange={(event) => setQueue(event.target.value)}
            className="h-11 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm text-slate-700 outline-none"
          >
            <option value="all">Todas as filas</option>
            {queues.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-11 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm text-slate-700 outline-none"
          >
            <option value="all">Todos os status</option>
            {["answered", "ended", "missed", "abandoned", "failed", "transferred"].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Filter className="h-4 w-4" />
          <CalendarRange className="h-4 w-4" />
          <span>{filteredRows.length} registros encontrados</span>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-[#E5E7EB]">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              {["Cliente", "Telefone", "Agente", "Status", "Duracao", "Data", "Acoes"].map((head) => (
                <th key={head} className="px-4 py-3 font-medium">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.id} className="border-t border-[#E5E7EB] bg-white">
                <td className="px-4 py-3 font-medium text-slate-900">{row.clientName}</td>
                <td className="px-4 py-3 text-slate-600">{formatPhone(row.phone)}</td>
                <td className="px-4 py-3 text-slate-600">{row.agentName}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{formatSeconds(row.durationSeconds)}</td>
                <td className="px-4 py-3 text-slate-600">{row.createdAtLabel}</td>
                <td className="px-4 py-3">
                  {row.recordingUrl ? (
                    <a
                      href={row.recordingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Ver gravacao
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">Sem gravacao</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
