"use client"

import { BarChart3, Clock3, PhoneCall, PhoneMissed, TimerReset, UserRoundCheck } from "lucide-react"
import KPIHeader from "@/components/voice/KPIHeader"
import QueueCard from "@/components/voice/QueueCard"
import QueueCallerItem from "@/components/voice/QueueCallerItem"
import { formatSeconds, useVoiceData, useVoiceDerivedData } from "@/lib/voice/api"

export default function VoiceQueuesPage() {
  const { calls, agents, queues, loading, reload, statusText } = useVoiceData()
  const { metrics, queueSummaries, queueCallers } = useVoiceDerivedData(calls, agents, queues)

  return (
    <div className="space-y-6">
      <KPIHeader
        title="Monitoramento de filas"
        description="Uma visao operacional limpa para supervisao de atendimento, fila de entrada e gargalos de SLA."
        items={[
          {
            label: "Atendidas hoje",
            value: String(metrics.answeredToday),
            hint: "Chamadas conectadas e registradas no dia.",
            icon: <PhoneCall className="h-4 w-4" />
          },
          {
            label: "Perdidas",
            value: String(metrics.missedToday),
            hint: "Perdidas ou abandonadas dentro do periodo atual.",
            icon: <PhoneMissed className="h-4 w-4" />
          },
          {
            label: "SLA",
            value: `${metrics.slaPercent}%`,
            hint: "Percentual atendido dentro da meta de espera.",
            icon: <BarChart3 className="h-4 w-4" />
          },
          {
            label: "T.M. atendimento",
            value: formatSeconds(metrics.avgHandleSeconds),
            hint: "Tempo medio de conversa por ligacao atendida.",
            icon: <Clock3 className="h-4 w-4" />
          },
          {
            label: "T.M. espera",
            value: formatSeconds(metrics.avgWaitSeconds),
            hint: "Media geral de espera em fila.",
            icon: <TimerReset className="h-4 w-4" />
          },
          {
            label: "T.M. abandono",
            value: formatSeconds(metrics.avgAbandonSeconds),
            hint: "Quanto tempo o cliente espera antes de desistir.",
            icon: <UserRoundCheck className="h-4 w-4" />
          }
        ]}
      />

      <section className="grid gap-4 xl:grid-cols-2">
        {queueSummaries.map((queue) => (
          <QueueCard key={queue.id} queue={queue} />
        ))}
      </section>

      <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.18)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Clientes na fila</h2>
            <p className="mt-1 text-sm text-slate-500">
              Cards horizontais para atuar rapido na entrada, com foco em tempo de espera crescente.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {loading ? "Atualizando..." : statusText}
            </span>
            <button
              type="button"
              onClick={reload}
              className="rounded-xl border border-[#E5E7EB] px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Recarregar
            </button>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {queueCallers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-slate-50 p-10 text-center text-sm text-slate-500">
              Nenhum cliente aguardando atendimento no momento.
            </div>
          ) : (
            queueCallers.map((caller) => <QueueCallerItem key={caller.id} caller={caller} />)
          )}
        </div>
      </section>
    </div>
  )
}
