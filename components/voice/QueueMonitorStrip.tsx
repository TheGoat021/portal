"use client"

import { Radio } from "lucide-react"
import { QueueMonitorCardData } from "@/lib/voice/monitoring"
import QueueMonitorCard from "@/components/voice/QueueMonitorCard"

export default function QueueMonitorStrip({ queues }: { queues: QueueMonitorCardData[] }) {
  const visibleQueues = queues.filter((queue) => queue.waitingCount > 0)

  return (
    <section className="rounded-[24px] border border-[#d9e2ec] bg-white p-4 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.18)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            <Radio className="h-4 w-4 text-emerald-500" />
            Monitoramento de Filas
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
          {queues.reduce((sum, queue) => sum + queue.waitingCount, 0)} chamadas em espera
        </span>
      </div>

      {visibleQueues.length > 0 ? (
        <div className="mt-4 overflow-x-auto pb-2">
          <div className="flex min-w-max gap-3">
            {visibleQueues.map((queue) => (
              <QueueMonitorCard key={queue.id} queue={queue} />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-[20px] border border-dashed border-[#d9e2ec] bg-slate-50 px-4 py-6 text-sm text-slate-500">
          Nenhuma fila possui clientes aguardando neste momento.
        </div>
      )}
    </section>
  )
}
