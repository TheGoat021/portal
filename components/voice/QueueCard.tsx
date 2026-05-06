"use client"

import { Clock3, Headphones, ListOrdered, Siren } from "lucide-react"
import { formatSeconds } from "@/lib/voice/api"
import { VoiceQueueSummary } from "@/lib/voice/types"

export default function QueueCard({ queue }: { queue: VoiceQueueSummary }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-26px_rgba(15,23,42,0.24)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">{queue.name}</h3>
          <p className="mt-1 text-sm text-slate-500">Slug: {queue.slug}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            queue.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
          }`}
        >
          {queue.statusLabel}
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {[
          {
            label: "Chamadas na fila",
            value: String(queue.callsInQueue),
            icon: <ListOrdered className="h-4 w-4" />
          },
          {
            label: "T.M. espera",
            value: formatSeconds(queue.avgWaitSeconds),
            icon: <Clock3 className="h-4 w-4" />
          },
          {
            label: "Atendentes ativos",
            value: String(queue.activeAgents),
            icon: <Headphones className="h-4 w-4" />
          },
          {
            label: "Operacao",
            value: queue.active ? "Online" : "Pausada",
            icon: <Siren className="h-4 w-4" />
          }
        ].map((item) => (
          <div key={item.label} className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-slate-500">
              {item.icon}
              <span className="text-xs uppercase tracking-[0.18em]">{item.label}</span>
            </div>
            <p className="mt-2 text-lg font-semibold text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
